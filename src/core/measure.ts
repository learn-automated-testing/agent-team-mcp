import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { assertPathUnderAllowedRoots, claudeProjectsRoot } from "./path-guard.js";

export interface MeasureOptions {
  projectDir: string;
  transcript?: string;
  transcriptPath?: string;
}

export interface SkillMatch {
  messageIndex: number;
  text: string;
  matchedPhrase: string;
}

export interface SkillMeasurement {
  name: string;
  triggerPhrases: string[];
  expectedMatches: number;
  exampleMatches: SkillMatch[];
}

export interface AgentInvocation {
  name: string;
  taskInvocations: number;
}

export interface MeasureReport {
  projectName: string;
  transcriptSource: string;
  totalMessages: number;
  userMessagesAnalyzed: number;
  perSkill: SkillMeasurement[];
  perAgent: AgentInvocation[];
  uncoveredUserMessages: Array<{ index: number; text: string }>;
  suggestions: string[];
}

interface InstalledSkill {
  name: string;
  description: string;
  triggerPhrases: string[];
}

interface ParsedMessage {
  role: "user" | "assistant" | "other";
  text: string;
  taskTargets: string[];
}

// Double-quoted trigger phrases only. Apostrophes inside phrases (e.g. "it's broken")
// must not terminate the match — extracting "it" would cause spurious substring matches.
const QUOTE_RE = /(?:"([^"\n]{2,80}?)"|\u201c([^\u201c\u201d\n]{2,80}?)\u201d)/g;

function parseFrontmatter(body: string): Record<string, string> | null {
  if (!body.startsWith("---\n")) return null;
  const end = body.indexOf("\n---", 4);
  if (end === -1) return null;
  const block = body.slice(4, end);
  const result: Record<string, string> = {};
  let currentKey: string | null = null;
  for (const line of block.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      currentKey = m[1];
      result[currentKey] = m[2].trim();
    } else if (currentKey && line.trim().startsWith(">")) {
      result[currentKey] = (result[currentKey] + " " + line.trim().slice(1).trim()).trim();
    }
  }
  return result;
}

function extractTriggerPhrases(description: string): string[] {
  const phrases = new Set<string>();
  for (const m of description.matchAll(QUOTE_RE)) {
    const phrase = (m[1] ?? m[2] ?? "").toLowerCase().trim();
    if (phrase.length >= 2) phrases.add(phrase);
  }
  return [...phrases];
}

async function readInstalledSkills(projectDir: string): Promise<InstalledSkill[]> {
  const dir = join(projectDir, ".claude", "skills");
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const skills: InstalledSkill[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const path = join(dir, e.name, "SKILL.md");
    if (!existsSync(path)) continue;
    const body = await readFile(path, "utf8");
    const fm = parseFrontmatter(body);
    if (!fm || !fm.description) continue;
    skills.push({
      name: fm.name || e.name,
      description: fm.description,
      triggerPhrases: extractTriggerPhrases(fm.description),
    });
  }
  return skills;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (typeof c === "object" && c !== null && "text" in c) {
          const t = (c as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function extractTaskTargets(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  const targets: string[] = [];
  for (const c of content) {
    if (typeof c !== "object" || c === null) continue;
    const obj = c as { type?: string; name?: string; input?: { subagent_type?: string } };
    if (obj.type === "tool_use" && obj.name === "Task") {
      const t = obj.input?.subagent_type;
      if (typeof t === "string") targets.push(t);
    }
  }
  return targets;
}

function parseTranscript(raw: string): ParsedMessage[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const lines = trimmed.split("\n").filter((l) => l.trim());

  const parsed: ParsedMessage[] = [];
  let allJsonl = true;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as {
        type?: string;
        role?: string;
        message?: { content?: unknown };
        content?: unknown;
      };
      if (typeof obj !== "object" || obj === null) {
        allJsonl = false;
        break;
      }
      let role: ParsedMessage["role"] = "other";
      if (obj.type === "user" || obj.role === "user") role = "user";
      else if (obj.type === "assistant" || obj.role === "assistant") role = "assistant";
      const content = obj.message?.content ?? obj.content;
      const text = extractTextFromContent(content);
      const taskTargets = extractTaskTargets(content);
      if (text || taskTargets.length > 0) {
        parsed.push({ role, text, taskTargets });
      }
    } catch {
      allJsonl = false;
      break;
    }
  }
  if (allJsonl && parsed.length > 0) return parsed;

  return [{ role: "user", text: trimmed, taskTargets: [] }];
}

export async function measureTeam(opts: MeasureOptions): Promise<MeasureReport> {
  const skills = await readInstalledSkills(opts.projectDir);

  const agentsDir = join(opts.projectDir, ".claude", "agents");
  const agentNames = existsSync(agentsDir)
    ? (await readdir(agentsDir)).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
    : [];

  const allowedRoots = [claudeProjectsRoot(), opts.projectDir];
  let raw = opts.transcript ?? "";
  let source = "(literal)";
  if (opts.transcriptPath) {
    const safe = assertPathUnderAllowedRoots(opts.transcriptPath, allowedRoots, "measureTeam.transcriptPath");
    raw = await readFile(safe, "utf8");
    source = safe;
  } else if (opts.transcript && existsSync(opts.transcript) && opts.transcript.length < 4096) {
    // Heuristic: treat as a file path only if it resolves under an allowed root.
    try {
      const safe = assertPathUnderAllowedRoots(opts.transcript, allowedRoots, "measureTeam.transcript");
      raw = await readFile(safe, "utf8");
      source = safe;
    } catch {
      // Not under an allowed root or unreadable — treat as literal transcript text.
    }
  }

  const messages = parseTranscript(raw);
  const userMessages = messages.filter((m) => m.role === "user");

  const perSkill: SkillMeasurement[] = skills.map((s) => ({
    name: s.name,
    triggerPhrases: s.triggerPhrases,
    expectedMatches: 0,
    exampleMatches: [],
  }));
  const skillByName = new Map(perSkill.map((s) => [s.name, s]));

  for (let i = 0; i < userMessages.length; i++) {
    const text = userMessages[i].text.toLowerCase();
    for (const skill of skills) {
      for (const phrase of skill.triggerPhrases) {
        if (text.includes(phrase)) {
          const sm = skillByName.get(skill.name)!;
          sm.expectedMatches++;
          if (sm.exampleMatches.length < 3) {
            sm.exampleMatches.push({
              messageIndex: i,
              text: userMessages[i].text.slice(0, 200),
              matchedPhrase: phrase,
            });
          }
          break;
        }
      }
    }
  }

  const invokedAgents = new Map<string, number>();
  for (const m of messages) {
    for (const t of m.taskTargets) {
      invokedAgents.set(t, (invokedAgents.get(t) ?? 0) + 1);
    }
  }
  const perAgent: AgentInvocation[] = agentNames.map((name) => ({
    name,
    taskInvocations: invokedAgents.get(name) ?? 0,
  }));

  const uncovered: Array<{ index: number; text: string }> = [];
  for (let i = 0; i < userMessages.length; i++) {
    const text = userMessages[i].text.toLowerCase();
    const matched = skills.some((s) => s.triggerPhrases.some((p) => text.includes(p)));
    if (!matched) {
      uncovered.push({ index: i, text: userMessages[i].text.slice(0, 200) });
    }
  }

  const suggestions: string[] = [];
  for (const s of perSkill) {
    if (s.expectedMatches === 0 && s.triggerPhrases.length > 0 && userMessages.length > 0) {
      suggestions.push(
        `'${s.name}' skill matched 0 of ${userMessages.length} user messages — its trigger phrases may need tuning, or the skill is unused.`,
      );
    }
  }
  if (userMessages.length >= 3 && uncovered.length > userMessages.length / 2) {
    suggestions.push(
      `${uncovered.length} of ${userMessages.length} user messages matched no skill — consider adding skills or expanding trigger phrases.`,
    );
  }
  const idleAgents = perAgent.filter((a) => a.taskInvocations === 0).map((a) => a.name);
  if (idleAgents.length > 0 && perAgent.some((a) => a.taskInvocations > 0)) {
    suggestions.push(`Agents never invoked via Task tool: ${idleAgents.join(", ")}. Check if handoffs are wired correctly.`);
  }

  return {
    projectName: basename(opts.projectDir),
    transcriptSource: source,
    totalMessages: messages.length,
    userMessagesAnalyzed: userMessages.length,
    perSkill,
    perAgent,
    uncoveredUserMessages: uncovered,
    suggestions,
  };
}
