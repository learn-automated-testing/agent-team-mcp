import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface MergeRulesInput {
  projectDir: string;
  into: string;
  from: string[];
  paths?: string[];
  title?: string;
  overwrite?: boolean;
}

export interface MergeRulesResult {
  saved: boolean;
  path: string;
  mergedBulletCount: number;
  deleted: string[];
  unionPaths: string[] | null;
}

export interface ArchiveRuleInput {
  projectDir: string;
  name: string;
}

export interface ArchiveRuleResult {
  archived: boolean;
  from: string;
  to: string;
}

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function rulePath(projectDir: string, name: string): string {
  return resolve(projectDir, ".claude", "rules", `${name}.md`);
}

function archivePath(projectDir: string, name: string): string {
  return resolve(projectDir, ".claude", "rules", "archive", `${name}.md`);
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

function parseTitle(body: string): string | null {
  for (const line of body.split("\n")) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}

function extractBody(body: string): string {
  if (!body.startsWith("---\n")) return body;
  const end = body.indexOf("\n---", 4);
  if (end === -1) return body;
  return body.slice(end + 4).replace(/^\n+/, "");
}

export async function mergeRules(input: MergeRulesInput): Promise<MergeRulesResult> {
  if (!NAME_RE.test(input.into)) {
    throw new Error(`'into' must be kebab-case. Got: '${input.into}'`);
  }
  if (input.from.length < 2) {
    throw new Error("'from' must include at least 2 source rule names");
  }
  for (const src of input.from) {
    if (!NAME_RE.test(src)) throw new Error(`'from' entry '${src}' must be kebab-case`);
    if (!existsSync(rulePath(input.projectDir, src))) {
      throw new Error(`Source rule '${src}' not found at ${rulePath(input.projectDir, src)}`);
    }
  }
  const intoPath = rulePath(input.projectDir, input.into);
  const intoExists = existsSync(intoPath);
  if (intoExists && !input.overwrite && !input.from.includes(input.into)) {
    throw new Error(`Target '${input.into}' already exists. Pass overwrite=true or include it in 'from' to merge into it.`);
  }

  const unionPathsSet = new Set<string>();
  const allBullets: string[] = [];
  const titles: string[] = [];
  const sectionBodies: string[] = [];

  for (const src of input.from) {
    const body = await readFile(rulePath(input.projectDir, src), "utf8");
    const paths = parseFrontmatterPaths(body);
    const title = parseTitle(body) ?? src;
    if (paths) for (const p of paths) unionPathsSet.add(p);
    titles.push(title);
    const bodyOnly = extractBody(body);
    sectionBodies.push(bodyOnly);
    for (const line of bodyOnly.split("\n")) {
      const m = line.match(/^\s*[-*]\s+(.+)$/);
      if (m) allBullets.push(m[1].trim());
    }
  }

  const finalPaths = input.paths ?? (unionPathsSet.size > 0 ? [...unionPathsSet] : null);
  const finalTitle = input.title ?? titles[0];

  const out: string[] = [];
  if (finalPaths && finalPaths.length > 0) {
    out.push("---");
    out.push("paths:");
    for (const p of finalPaths) out.push(`  - "${p}"`);
    out.push("---");
    out.push("");
  }
  out.push(`# ${finalTitle}`);
  out.push("");
  out.push("## Rules");
  out.push("");
  const seen = new Set<string>();
  for (const b of allBullets) {
    const key = b.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`- ${b}`);
  }

  await writeFile(intoPath, out.join("\n") + "\n", "utf8");

  const deleted: string[] = [];
  for (const src of input.from) {
    if (src === input.into) continue;
    await unlink(rulePath(input.projectDir, src));
    deleted.push(rulePath(input.projectDir, src));
  }

  return {
    saved: true,
    path: intoPath,
    mergedBulletCount: seen.size,
    deleted,
    unionPaths: finalPaths,
  };
}

export async function archiveRule(input: ArchiveRuleInput): Promise<ArchiveRuleResult> {
  if (!NAME_RE.test(input.name)) {
    throw new Error(`Rule name must be kebab-case. Got: '${input.name}'`);
  }
  const from = rulePath(input.projectDir, input.name);
  if (!existsSync(from)) {
    throw new Error(`Rule '${input.name}' not found at ${from}`);
  }
  const to = archivePath(input.projectDir, input.name);
  await mkdir(join(to, ".."), { recursive: true });
  if (existsSync(to)) {
    throw new Error(`Archive target already exists: ${to}`);
  }
  await rename(from, to);
  return { archived: true, from, to };
}
