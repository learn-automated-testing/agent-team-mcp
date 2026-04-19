import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { globToRegExp } from "./glob-match.js";
import { listRules, type RuleSummary } from "./rules.js";

export type RuleHealth = "good" | "warning" | "cluttered";

export interface DuplicateGroup {
  bullet: string;
  files: string[];
}

export interface StaleRule {
  name: string;
  paths: string[];
  reason: string;
}

export interface OversizeRule {
  name: string;
  lines: number;
}

export interface RuleAuditReport {
  rulesDirectory: string;
  total: number;
  scoped: number;
  unscoped: number;
  duplicates: DuplicateGroup[];
  stale: StaleRule[];
  oversize: OversizeRule[];
  ruleSummaries: RuleSummary[];
  health: RuleHealth;
  thresholds: { maxUnscoped: number; maxTotal: number; maxLinesPerFile: number };
  warnings: string[];
}

const THRESHOLDS = { maxUnscoped: 5, maxTotal: 20, maxLinesPerFile: 80 };

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");
}

function stripFrontmatter(body: string): string {
  if (!body.startsWith("---\n")) return body;
  const end = body.indexOf("\n---", 4);
  if (end === -1) return body;
  return body.slice(end + 4).replace(/^\n+/, "");
}

function extractBullets(body: string): string[] {
  const afterFm = stripFrontmatter(body);
  const bullets: string[] = [];
  for (const line of afterFm.split("\n")) {
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
    if (m) {
      const t = m[1].replace(/\*\*(.+?)\*\*/g, "$1").trim();
      if (t.length >= 6) bullets.push(t);
    }
  }
  return bullets;
}

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "target", ".next", ".venv", "venv", "__pycache__", ".claude"]);

async function anyMatch(projectDir: string, patterns: string[]): Promise<boolean> {
  const regs = patterns.map(globToRegExp);
  let found = false;
  async function walk(dir: string, rel: string, depth: number): Promise<void> {
    if (found || depth > 8) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (found) return;
      if (IGNORE_DIRS.has(e.name)) continue;
      if (e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      const rp = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(full, rp, depth + 1);
      else if (e.isFile()) {
        for (const r of regs) {
          if (r.test(rp)) { found = true; return; }
        }
      }
    }
  }
  await walk(projectDir, "", 0);
  return found;
}

export async function auditRules(projectDir: string): Promise<RuleAuditReport> {
  const rulesResult = await listRules({ projectDir });
  const rulesDir = resolve(projectDir, ".claude", "rules");

  const bulletToFiles = new Map<string, string[]>();
  const stale: StaleRule[] = [];
  const oversize: OversizeRule[] = [];
  let scoped = 0;
  let unscoped = 0;

  for (const r of rulesResult.rules) {
    const body = await readFile(r.path, "utf8");
    const lineCount = body.split("\n").length;
    if (lineCount > THRESHOLDS.maxLinesPerFile) {
      oversize.push({ name: r.name, lines: lineCount });
    }
    if (r.paths && r.paths.length > 0) {
      scoped++;
      const matched = await anyMatch(projectDir, r.paths);
      if (!matched) stale.push({ name: r.name, paths: r.paths, reason: "No files in repo match any of this rule's paths globs." });
    } else {
      unscoped++;
    }
    for (const b of extractBullets(body)) {
      const key = normalize(b);
      const arr = bulletToFiles.get(key) ?? [];
      arr.push(r.name);
      bulletToFiles.set(key, arr);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [bullet, files] of bulletToFiles) {
    const uniq = [...new Set(files)];
    if (uniq.length >= 2) duplicates.push({ bullet, files: uniq });
  }

  const warnings: string[] = [];
  if (unscoped > THRESHOLDS.maxUnscoped) {
    warnings.push(`Unscoped rule count (${unscoped}) exceeds recommended max (${THRESHOLDS.maxUnscoped}). Consider scoping with \`paths:\` frontmatter.`);
  }
  if (rulesResult.total > THRESHOLDS.maxTotal) {
    warnings.push(`Total rule count (${rulesResult.total}) exceeds recommended max (${THRESHOLDS.maxTotal}). Consider merging related rules.`);
  }
  for (const o of oversize) {
    warnings.push(`Rule '${o.name}' is ${o.lines} lines — consider splitting (max recommended ${THRESHOLDS.maxLinesPerFile}).`);
  }
  for (const s of stale) {
    warnings.push(`Rule '${s.name}' targets paths with no matching files: ${s.paths.join(", ")}`);
  }
  for (const d of duplicates) {
    warnings.push(`Duplicate bullet across ${d.files.join(", ")}: "${d.bullet.slice(0, 60)}..."`);
  }

  let health: RuleHealth = "good";
  if (warnings.length > 0) health = "warning";
  if (
    unscoped > THRESHOLDS.maxUnscoped ||
    rulesResult.total > THRESHOLDS.maxTotal ||
    duplicates.length > 0 ||
    stale.length > 2 ||
    oversize.length > 0
  ) {
    health = unscoped > THRESHOLDS.maxUnscoped * 2 || duplicates.length > 3 ? "cluttered" : "warning";
  }

  return {
    rulesDirectory: rulesDir,
    total: rulesResult.total,
    scoped,
    unscoped,
    duplicates,
    stale,
    oversize,
    ruleSummaries: rulesResult.rules,
    health,
    thresholds: THRESHOLDS,
    warnings,
  };
}
