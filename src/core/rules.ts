import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { globMatches } from "./glob-match.js";

export interface AddRuleInput {
  projectDir: string;
  name: string;
  paths?: string[];
  title: string;
  rules: string | string[];
  reason?: string;
  goodExample?: { code: string; language?: string };
  badExample?: { code: string; language?: string };
  overwrite?: boolean;
}

export interface AddRuleResult {
  saved: boolean;
  path: string;
  alreadyExisted: boolean;
}

export interface RuleSummary {
  name: string;
  path: string;
  paths: string[] | null;
  title: string;
  bodyPreview: string;
}

export interface ListRulesInput {
  projectDir: string;
  pathFilter?: string;
}

export interface ListRulesResult {
  directory: string;
  total: number;
  rules: RuleSummary[];
}

const RULE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function rulesDir(projectDir: string): string {
  return resolve(projectDir, ".claude", "rules");
}

function rulePath(projectDir: string, name: string): string {
  return join(rulesDir(projectDir), `${name}.md`);
}

function renderRule(input: AddRuleInput): string {
  const lines: string[] = [];

  if (input.paths && input.paths.length > 0) {
    lines.push("---");
    lines.push("paths:");
    for (const p of input.paths) lines.push(`  - "${p}"`);
    lines.push("---");
    lines.push("");
  }

  lines.push(`# ${input.title}`);
  lines.push("");
  lines.push("## Rules");
  lines.push("");
  const ruleArr = Array.isArray(input.rules) ? input.rules : [input.rules];
  for (const r of ruleArr) lines.push(`- ${r.trim()}`);

  if (input.reason && input.reason.trim()) {
    lines.push("");
    lines.push(`**Why:** ${input.reason.trim()}`);
  }

  if (input.goodExample || input.badExample) {
    lines.push("");
    lines.push("## Examples");

    if (input.goodExample) {
      lines.push("");
      lines.push("### Good");
      lines.push("");
      lines.push("```" + (input.goodExample.language ?? ""));
      lines.push(input.goodExample.code.trimEnd());
      lines.push("```");
    }

    if (input.badExample) {
      lines.push("");
      lines.push("### Bad");
      lines.push("");
      lines.push("```" + (input.badExample.language ?? ""));
      lines.push(input.badExample.code.trimEnd());
      lines.push("```");
    }
  }

  return lines.join("\n") + "\n";
}

export async function addRule(input: AddRuleInput): Promise<AddRuleResult> {
  if (!RULE_NAME_RE.test(input.name)) {
    throw new Error(`Rule name must be kebab-case (a-z, 0-9, hyphens). Got: '${input.name}'`);
  }
  if (!input.title || !input.title.trim()) {
    throw new Error("Rule 'title' is required.");
  }
  if (!input.rules || (Array.isArray(input.rules) && input.rules.length === 0)) {
    throw new Error("Rule must include at least one rule string in 'rules'.");
  }

  const path = rulePath(input.projectDir, input.name);
  const alreadyExisted = existsSync(path);
  if (alreadyExisted && !input.overwrite) {
    return { saved: false, path, alreadyExisted: true };
  }

  await mkdir(rulesDir(input.projectDir), { recursive: true });
  await writeFile(path, renderRule(input), "utf8");
  return { saved: true, path, alreadyExisted };
}

function parseFrontmatterPaths(body: string): string[] | null {
  if (!body.startsWith("---\n")) return null;
  const end = body.indexOf("\n---", 4);
  if (end === -1) return null;
  const block = body.slice(4, end);
  const pathsLineIdx = block.split("\n").findIndex((l) => l.trim() === "paths:");
  if (pathsLineIdx === -1) return null;
  const lines = block.split("\n").slice(pathsLineIdx + 1);
  const paths: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*-\s*["']?(.+?)["']?\s*$/);
    if (m) paths.push(m[1]);
    else if (line.trim() && !line.startsWith(" ") && !line.startsWith("-")) break;
  }
  return paths.length > 0 ? paths : null;
}

function parseTitle(body: string): string {
  const lines = body.split("\n");
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return "(untitled)";
}

export async function listRules(input: ListRulesInput): Promise<ListRulesResult> {
  const dir = rulesDir(input.projectDir);
  const result: ListRulesResult = { directory: dir, total: 0, rules: [] };
  if (!existsSync(dir)) return result;

  const entries = await readdir(dir);
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const path = join(dir, name);
    const body = await readFile(path, "utf8");
    const paths = parseFrontmatterPaths(body);
    const title = parseTitle(body);

    if (input.pathFilter && paths) {
      const matches = paths.some((p) => globMatches(p, input.pathFilter!));
      if (!matches) continue;
    } else if (input.pathFilter && !paths) {
      // unscoped rules apply to all paths, so they always match a filter
    }

    const bodyWithoutFrontmatter = body.startsWith("---\n")
      ? body.slice(body.indexOf("\n---", 4) + 4).trimStart()
      : body;
    const bodyPreview = bodyWithoutFrontmatter.split("\n").slice(0, 10).join("\n");

    result.rules.push({
      name: basename(name, ".md"),
      path,
      paths,
      title,
      bodyPreview,
    });
  }
  result.total = result.rules.length;
  result.rules.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
