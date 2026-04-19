import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HOOKS_SRC_DIR = join(here, "..", "..", "templates", "hooks");

export interface HookInstallReport {
  scriptsWritten: string[];
  scriptsSkipped: Array<{ path: string; reason: string }>;
  settingsMerged: Array<{ event: string; command: string; action: "added" | "already-present" }>;
  preCommit:
    | { installed: true; path: string; via: "husky" | "git-hooks"; action: "added" | "already-present" }
    | { installed: false; reason: string };
}

interface HookCommand {
  type: "command";
  command: string;
}
interface HookMatcher {
  matcher?: string;
  hooks: HookCommand[];
}
interface Settings {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

const SCRIPTS = [
  { src: "stack-freshness.mjs", event: "PostToolUse", matcher: "Edit|Write" },
  { src: "state-validator.mjs", event: "Stop", matcher: undefined },
] as const;

async function readJson(path: string): Promise<Settings> {
  try {
    const raw = await readFile(path, "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
}

function mergeOne(
  settings: Settings,
  event: string,
  matcher: string | undefined,
  command: string,
): "added" | "already-present" {
  settings.hooks ??= {};
  settings.hooks[event] ??= [];
  const arr = settings.hooks[event]!;
  for (const m of arr) {
    if (m.matcher === matcher) {
      if (m.hooks.some((h) => h.command === command)) return "already-present";
      m.hooks.push({ type: "command", command });
      return "added";
    }
  }
  arr.push({ matcher, hooks: [{ type: "command", command }] });
  return "added";
}

async function installPreCommit(
  projectDir: string,
  hookSrcPath: string,
): Promise<HookInstallReport["preCommit"]> {
  const huskyDir = join(projectDir, ".husky");
  const gitDir = join(projectDir, ".git");
  const huskyHas = existsSync(huskyDir);
  const gitHas = existsSync(gitDir);

  if (!huskyHas && !gitHas) {
    return { installed: false, reason: "No .husky/ or .git/ directory detected; this project is not a git repo." };
  }

  const via: "husky" | "git-hooks" = huskyHas ? "husky" : "git-hooks";
  const targetDir = huskyHas ? huskyDir : join(gitDir, "hooks");
  const target = join(targetDir, "pre-commit");

  await mkdir(targetDir, { recursive: true });
  const srcContent = await readFile(hookSrcPath, "utf8");

  if (existsSync(target)) {
    const existing = await readFile(target, "utf8");
    if (existing.includes("skillsrepo: pre-commit workflow gate")) {
      return { installed: true, path: target, via, action: "already-present" };
    }
    // Pre-existing different hook — append our gate section at the end
    const merged = existing.trimEnd() + "\n\n# --- skillsrepo pre-commit gate ---\n" + stripShebang(srcContent);
    await writeFile(target, merged, "utf8");
    await chmod(target, 0o755);
    return { installed: true, path: target, via, action: "added" };
  }

  await writeFile(target, srcContent, "utf8");
  await chmod(target, 0o755);
  return { installed: true, path: target, via, action: "added" };
}

function stripShebang(s: string): string {
  return s.startsWith("#!") ? s.slice(s.indexOf("\n") + 1) : s;
}

export async function installHooks(projectDir: string): Promise<HookInstallReport> {
  const report: HookInstallReport = {
    scriptsWritten: [],
    scriptsSkipped: [],
    settingsMerged: [],
    preCommit: { installed: false, reason: "not-attempted" },
  };

  const hooksOutDir = resolve(projectDir, ".claude", "hooks");
  await mkdir(hooksOutDir, { recursive: true });

  for (const s of SCRIPTS) {
    const src = join(HOOKS_SRC_DIR, s.src);
    const dest = join(hooksOutDir, s.src);
    await copyFile(src, dest);
    await chmod(dest, 0o755);
    report.scriptsWritten.push(dest);
  }

  const settingsPath = resolve(projectDir, ".claude", "settings.json");
  const settings = await readJson(settingsPath);
  for (const s of SCRIPTS) {
    const cmd = `node .claude/hooks/${s.src}`;
    const action = mergeOne(settings, s.event, s.matcher, cmd);
    report.settingsMerged.push({ event: s.event, command: cmd, action });
  }
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");

  report.preCommit = await installPreCommit(projectDir, join(HOOKS_SRC_DIR, "pre-commit-gate.sh"));

  return report;
}
