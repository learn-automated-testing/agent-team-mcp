import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { readMetadataForLessons } from "./lessons.js";
import { assertPathUnderAllowedRoots, claudeProjectsRoot } from "./path-guard.js";
import { listRules } from "./rules.js";

export interface MineMemoryInput {
  projectDir: string;
  memoryDir?: string;
}

export type PromotionTarget = "rule" | "lesson";

export interface Candidate {
  text: string;
  source: string;
  category: string | null;
  target: PromotionTarget;
  suggested: {
    ruleName?: string;
    rulePaths?: string[];
    lessonCategory?: "code" | "process" | "tooling" | "domain";
  };
}

export interface MineMemoryResult {
  memoryDir: string;
  memoryExists: boolean;
  candidates: Candidate[];
  total: number;
  alreadyCaptured: number;
}

const LANG_HINTS: Array<{ re: RegExp; paths: string[]; ruleSuffix: string }> = [
  { re: /\b(typescript|\.ts|\.tsx)\b/i, paths: ["**/*.ts", "**/*.tsx"], ruleSuffix: "typescript" },
  { re: /\bjavascript\b/i, paths: ["**/*.js", "**/*.jsx"], ruleSuffix: "javascript" },
  { re: /\b(python|\.py)\b/i, paths: ["**/*.py"], ruleSuffix: "python" },
  { re: /\b(go|golang)\b/i, paths: ["**/*.go"], ruleSuffix: "go" },
  { re: /\b(rust|\.rs)\b/i, paths: ["**/*.rs"], ruleSuffix: "rust" },
  { re: /\bjava\b/i, paths: ["**/*.java"], ruleSuffix: "java" },
  { re: /\btest(s|ing)?\b/i, paths: ["**/*.test.*", "tests/**/*", "**/__tests__/**/*"], ruleSuffix: "tests" },
  { re: /\bsql\b/i, paths: ["**/*.sql"], ruleSuffix: "sql" },
];

const INCIDENT_WORDS = /\b(never|always|whenever|because|do not|don't|must|required)\b/i;

function encodeProjectPath(abs: string): string {
  return abs.replace(/\//g, "-");
}

function defaultMemoryDir(projectDir: string): string {
  return join(homedir(), ".claude", "projects", encodeProjectPath(resolve(projectDir)), "memory");
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");
}

function slugify(s: string, max = 40): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

function extractEntries(body: string, source: string): Array<{ text: string; category: string | null; source: string }> {
  const lines = body.split("\n");
  const entries: Array<{ text: string; category: string | null; source: string }> = [];
  let currentCategory: string | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      currentCategory = headerMatch[1].trim();
      continue;
    }
    const bulletMatch = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1].trim();
      if (text.length >= 8) entries.push({ text, category: currentCategory, source });
    }
  }
  return entries;
}

function inferLanguageHint(text: string): { paths: string[]; ruleSuffix: string } | null {
  for (const h of LANG_HINTS) if (h.re.test(text)) return { paths: h.paths, ruleSuffix: h.ruleSuffix };
  return null;
}

function suggestCandidate(text: string, category: string | null, source: string): Candidate {
  const hint = inferLanguageHint(text);
  const looksLikeRule = !!hint || INCIDENT_WORDS.test(text);
  if (looksLikeRule) {
    const nameSeed = (category ?? text).slice(0, 40);
    const ruleName = hint
      ? `${slugify(nameSeed) || "rule"}-${hint.ruleSuffix}`.replace(/--+/g, "-")
      : slugify(nameSeed) || "rule";
    return {
      text,
      source,
      category,
      target: "rule",
      suggested: {
        ruleName,
        rulePaths: hint?.paths,
      },
    };
  }
  let lessonCategory: "code" | "process" | "tooling" | "domain" = "code";
  if (/\b(deploy|build|ci|release|pipeline)\b/i.test(text)) lessonCategory = "tooling";
  else if (/\b(workflow|process|review|pr|commit|handoff)\b/i.test(text)) lessonCategory = "process";
  else if (category && /domain|business|user|customer/i.test(category)) lessonCategory = "domain";
  return { text, source, category, target: "lesson", suggested: { lessonCategory } };
}

async function gatherExistingTexts(projectDir: string): Promise<Set<string>> {
  const texts = new Set<string>();

  const rulesResult = await listRules({ projectDir });
  for (const r of rulesResult.rules) {
    const body = await readFile(r.path, "utf8").catch(() => "");
    for (const line of body.split("\n")) {
      const m = line.match(/^\s*[-*]\s+(.+)$/);
      if (m) texts.add(normalize(m[1]));
    }
  }

  const meta = await readMetadataForLessons(projectDir);
  if (meta?.lessons) for (const l of meta.lessons) texts.add(normalize(l.lesson));

  const contextPath = resolve(projectDir, ".claude", "context.md");
  if (existsSync(contextPath)) {
    const body = await readFile(contextPath, "utf8");
    const learnedIdx = body.indexOf("## Learned conventions");
    if (learnedIdx !== -1) {
      const after = body.slice(learnedIdx);
      const nextHeader = after.slice(5).search(/\n## /);
      const section = nextHeader === -1 ? after : after.slice(0, nextHeader);
      for (const line of section.split("\n")) {
        const m = line.match(/^\s*[-*]\s+(.+)$/);
        if (m) texts.add(normalize(m[1]).replace(/\*\*\[[^\]]+\]\*\*\s*/g, ""));
      }
    }
  }

  return texts;
}

export async function mineMemory(input: MineMemoryInput): Promise<MineMemoryResult> {
  const memDir = input.memoryDir
    ? assertPathUnderAllowedRoots(
        input.memoryDir,
        [claudeProjectsRoot(), input.projectDir],
        "mineMemory.memoryDir",
      )
    : defaultMemoryDir(input.projectDir);
  const memoryExists = existsSync(memDir);
  if (!memoryExists) {
    return { memoryDir: memDir, memoryExists: false, candidates: [], total: 0, alreadyCaptured: 0 };
  }

  const entries: Array<{ text: string; category: string | null; source: string }> = [];
  const files = (await readdir(memDir)).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    const body = await readFile(join(memDir, f), "utf8");
    entries.push(...extractEntries(body, f));
  }

  const existing = await gatherExistingTexts(input.projectDir);
  // Precompute the long-text shortlist once — the substring check below
  // only cares about texts >20 chars, so filter out short entries up front.
  const longExisting = [...existing].filter((x) => x.length > 20);
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  let alreadyCaptured = 0;
  for (const e of entries) {
    const key = normalize(e.text);
    if (seen.has(key)) continue;
    seen.add(key);
    if (existing.has(key)) {
      alreadyCaptured++;
      continue;
    }
    let isDuplicate = false;
    for (const existingText of longExisting) {
      if (key.includes(existingText) || existingText.includes(key)) {
        isDuplicate = true;
        break;
      }
    }
    if (isDuplicate) {
      alreadyCaptured++;
      continue;
    }
    candidates.push(suggestCandidate(e.text, e.category, e.source));
  }

  return {
    memoryDir: memDir,
    memoryExists: true,
    candidates,
    total: candidates.length,
    alreadyCaptured,
  };
}
