import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";
import { detectInstalledMcps } from "./mcp-detect.js";
import type { Fingerprint } from "./types.js";

const LANG_EXT: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
};

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "target",
  ".next", ".venv", "venv", "__pycache__", ".turbo", ".cache",
]);

const DB_DEPS = new Set([
  "prisma", "@prisma/client", "drizzle-orm", "typeorm", "sequelize", "mongoose",
  "pg", "mysql2", "sqlite3", "better-sqlite3", "mongodb", "kysely",
  "sqlalchemy", "alembic", "psycopg2", "psycopg2-binary", "asyncpg",
]);

async function walk(
  dir: string,
  maxDepth: number,
  onFile: (path: string) => void,
  depth = 0,
): Promise<void> {
  if (depth > maxDepth) return;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    if (e.name.startsWith(".") && e.name !== ".github" && e.name !== ".claude") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, maxDepth, onFile, depth + 1);
    else if (e.isFile()) onFile(full);
  }
}

async function readJson<T = unknown>(path: string): Promise<T | null> {
  try { return JSON.parse(await readFile(path, "utf8")) as T; } catch { return null; }
}

function safeGit(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return null; }
}

export async function inspectProject(projectDir: string): Promise<Fingerprint> {
  const languages: Record<string, number> = {};
  const ciFiles = new Set<string>();
  const deploySignals = new Set<string>();
  const iacSignals = new Set<string>();
  const mobileSignals = new Set<string>();
  let hasFrontend = false;
  let hasDartFile = false;
  const existingSkills: string[] = [];
  const existingAgents: string[] = [];

  await walk(projectDir, 6, (path) => {
    const name = basename(path);
    const ext = (() => { const i = name.lastIndexOf("."); return i === -1 ? "" : name.slice(i); })();
    const lang = LANG_EXT[ext];
    if (lang) languages[lang] = (languages[lang] ?? 0) + 1;
    if (ext === ".tsx" || ext === ".jsx") hasFrontend = true;

    if (path.includes("/.github/workflows/")) ciFiles.add("github-actions");
    if (name === ".gitlab-ci.yml") ciFiles.add("gitlab-ci");
    if (path.includes("/.circleci/")) ciFiles.add("circleci");

    if (name === "Dockerfile" || name.startsWith("Dockerfile.")) deploySignals.add("docker");
    if (name === "docker-compose.yml" || name === "docker-compose.yaml") deploySignals.add("docker-compose");
    if (name === "serverless.yml") deploySignals.add("serverless");
    if (name === "vercel.json") deploySignals.add("vercel");
    if (name === "netlify.toml") deploySignals.add("netlify");
    if (name === "app.yaml") deploySignals.add("app-engine");
    if (name === "Procfile") deploySignals.add("heroku");
    if (name === "fly.toml") deploySignals.add("fly");
    if (name.endsWith(".tf")) iacSignals.add("terraform");
    if (name === "Pulumi.yaml") iacSignals.add("pulumi");
    if (path.includes("/k8s/") || path.includes("/kubernetes/")) deploySignals.add("kubernetes");

    // Mobile platform signals — high-precision only (no bare .swift/.kt,
    // which also appear in server-side Swift / Spring Boot projects).
    if (name === "project.pbxproj") mobileSignals.add("ios");
    if (name === "AndroidManifest.xml") mobileSignals.add("android");
    if (name === "pubspec.yaml") mobileSignals.add("pubspec");
    if (ext === ".dart") hasDartFile = true;
    if (name === "metro.config.js") mobileSignals.add("react-native");

    if (path.includes("/.claude/skills/") && name === "SKILL.md") {
      const parts = path.split("/");
      const skillsIdx = parts.indexOf("skills");
      if (skillsIdx !== -1 && parts[skillsIdx + 1]) existingSkills.push(parts[skillsIdx + 1]);
    }
    if (path.includes("/.claude/agents/") && name.endsWith(".md")) {
      existingAgents.push(name.replace(/\.md$/, ""));
    }
  });

  const pkg = await readJson<{
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>(join(projectDir, "package.json"));
  const pyproject = existsSync(join(projectDir, "pyproject.toml"));
  const requirementsTxt = existsSync(join(projectDir, "requirements.txt"));
  const goMod = existsSync(join(projectDir, "go.mod"));
  const cargoToml = existsSync(join(projectDir, "Cargo.toml"));

  const packageManagers: string[] = [];
  if (pkg) packageManagers.push("npm");
  if (pyproject || requirementsTxt) packageManagers.push("pip");
  if (goMod) packageManagers.push("go-modules");
  if (cargoToml) packageManagers.push("cargo");

  const frameworks: string[] = [];
  const testFrameworks: string[] = [];
  let hasDatabase = false;

  if (pkg) {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    for (const dep of Object.keys(deps)) {
      if (DB_DEPS.has(dep)) hasDatabase = true;
    }
    if (deps["@modelcontextprotocol/sdk"]) frameworks.push("mcp");
    if (deps["next"]) { frameworks.push("next"); hasFrontend = true; }
    if (deps["react"]) { frameworks.push("react"); hasFrontend = true; }
    if (deps["vue"]) { frameworks.push("vue"); hasFrontend = true; }
    if (deps["svelte"]) { frameworks.push("svelte"); hasFrontend = true; }
    if (deps["astro"]) frameworks.push("astro");
    if (deps["express"]) frameworks.push("express");
    if (deps["fastify"]) frameworks.push("fastify");
    if (deps["hono"]) frameworks.push("hono");
    if (deps["vitest"]) testFrameworks.push("vitest");
    if (deps["jest"]) testFrameworks.push("jest");
    if (deps["mocha"]) testFrameworks.push("mocha");
    if (deps["playwright"] || deps["@playwright/test"]) testFrameworks.push("playwright");
    if (deps["cypress"]) testFrameworks.push("cypress");
    if (deps["react-native"]) mobileSignals.add("react-native");
    if (deps["expo"] || deps["expo-router"]) mobileSignals.add("expo");
  }

  if (requirementsTxt) {
    const raw = await readFile(join(projectDir, "requirements.txt"), "utf8").catch(() => "");
    for (const line of raw.split("\n")) {
      const name = line.trim().toLowerCase().split(/[=<>!~\s]/)[0];
      if (!name) continue;
      if (DB_DEPS.has(name)) hasDatabase = true;
      if (name === "fastapi") frameworks.push("fastapi");
      if (name === "django") { frameworks.push("django"); hasDatabase = true; }
      if (name === "flask") frameworks.push("flask");
      if (name === "pytest") testFrameworks.push("pytest");
    }
  }

  const readme = ["README.md", "readme.md", "README"].find((n) => existsSync(join(projectDir, n))) ?? null;
  const contributing = ["CONTRIBUTING.md", "contributing.md"].find((n) => existsSync(join(projectDir, n))) ?? null;
  const docsDir = existsSync(join(projectDir, "docs")) ? "docs" : null;

  const primaryLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const mobilePlatforms: string[] = [];
  if (mobileSignals.has("ios")) mobilePlatforms.push("ios");
  if (mobileSignals.has("android")) mobilePlatforms.push("android");
  if (mobileSignals.has("react-native")) mobilePlatforms.push("react-native");
  if (mobileSignals.has("expo")) mobilePlatforms.push("expo");
  if (mobileSignals.has("pubspec") && hasDartFile) mobilePlatforms.push("flutter");

  const lastCommit = safeGit(["log", "-1", "--format=%cI"], projectDir);
  const shortlog = safeGit(["shortlog", "-sn", "--all", "--no-merges"], projectDir);
  const contributors = shortlog ? shortlog.split("\n").filter(Boolean).length : 0;

  const installedMcps = await detectInstalledMcps(projectDir);

  return {
    projectDir,
    projectName: pkg?.name ?? basename(projectDir),
    languages,
    primaryLanguage,
    packageManagers,
    frameworks,
    testFrameworks,
    ci: [...ciFiles],
    deployTargets: [...deploySignals],
    iacTools: [...iacSignals],
    hasFrontend,
    hasDatabase,
    mobilePlatforms,
    installedMcps,
    docs: { readme, contributing, docsDir },
    existingAgents,
    existingSkills,
    git: lastCommit ? { contributors, lastCommit } : null,
  };
}
