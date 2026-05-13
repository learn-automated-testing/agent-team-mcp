import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installHooks } from "./install-hooks.js";
import { installSetup } from "./install.js";
import { recommendSetup } from "./recommend.js";
import type { Answers, Fingerprint } from "./types.js";

function tsFingerprint(dir: string): Fingerprint {
  return {
    projectDir: dir,
    projectName: "demo",
    languages: { typescript: 100 },
    primaryLanguage: "typescript",
    packageManagers: ["npm"],
    frameworks: ["mcp"],
    testFrameworks: ["vitest"],
    ci: [],
    deployTargets: [],
    iacTools: [],
    hasFrontend: false,
    hasDatabase: false,
    mobilePlatforms: [],
    installedMcps: [],
    docs: { readme: null, contributing: null, docsDir: null },
    existingAgents: [],
    existingSkills: [],
    git: null,
  };
}

async function runInstall(dir: string, answers: Answers, hooks: boolean) {
  const fp = tsFingerprint(dir);
  const plan = recommendSetup(fp);
  return installSetup(plan, fp, { outDir: dir, overwrite: false, answers, hooks });
}

describe("installHooks (US-001 / US-002 stack-freshness + state-validator)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-hooks-"));
    // Make it a git repo so installPreCommit has a target.
    execFileSync("git", ["init", "-q"], { cwd: dir });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should write the freshness and validator scripts under .claude/hooks/", async () => {
    const report = await installHooks(dir);
    expect(existsSync(join(dir, ".claude", "hooks", "stack-freshness.mjs"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "hooks", "state-validator.mjs"))).toBe(true);
    expect(report.scriptsWritten.length).toBe(2);
  });

  it("should add a PostToolUse hook entry pointing at the freshness script", async () => {
    await installHooks(dir);
    const settings = JSON.parse(await readFile(join(dir, ".claude", "settings.json"), "utf8"));
    const post = settings.hooks?.PostToolUse ?? [];
    const hasFreshness = post.some((m: { hooks: Array<{ command: string }> }) =>
      m.hooks.some((h) => h.command.includes("stack-freshness.mjs")),
    );
    expect(hasFreshness).toBe(true);
  });

  it("should add a Stop hook entry pointing at the state-validator script", async () => {
    await installHooks(dir);
    const settings = JSON.parse(await readFile(join(dir, ".claude", "settings.json"), "utf8"));
    const stop = settings.hooks?.Stop ?? [];
    const hasValidator = stop.some((m: { hooks: Array<{ command: string }> }) =>
      m.hooks.some((h) => h.command.includes("state-validator.mjs")),
    );
    expect(hasValidator).toBe(true);
  });

  it("should be idempotent — re-running does not duplicate the hook entries", async () => {
    await installHooks(dir);
    await installHooks(dir);
    const settings = JSON.parse(await readFile(join(dir, ".claude", "settings.json"), "utf8"));
    const post = settings.hooks?.PostToolUse ?? [];
    const freshnessHooks = post.flatMap((m: { hooks: Array<{ command: string }> }) =>
      m.hooks.filter((h) => h.command.includes("stack-freshness.mjs")),
    );
    expect(freshnessHooks.length).toBe(1);
  });

  it("should preserve pre-existing hook entries from another tool", async () => {
    const settingsPath = join(dir, ".claude", "settings.json");
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({ hooks: { PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo other" }] }] } }),
      "utf8",
    );
    await installHooks(dir);
    const settings = JSON.parse(await readFile(settingsPath, "utf8"));
    const post = settings.hooks.PostToolUse;
    const hasOther = post.some((m: { matcher?: string; hooks: Array<{ command: string }> }) =>
      m.matcher === "Bash" && m.hooks.some((h) => h.command === "echo other"),
    );
    expect(hasOther).toBe(true);
  });
});

describe("installHooks pre-commit (US-003 commit-gate)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-precommit-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should install under .git/hooks/pre-commit when no .husky/ is present", async () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const report = await installHooks(dir);
    expect(report.preCommit.installed).toBe(true);
    if (report.preCommit.installed) expect(report.preCommit.via).toBe("git-hooks");
    expect(existsSync(join(dir, ".git", "hooks", "pre-commit"))).toBe(true);
  });

  it("should install under .husky/pre-commit when .husky/ is present", async () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    mkdirSync(join(dir, ".husky"), { recursive: true });
    const report = await installHooks(dir);
    if (report.preCommit.installed) expect(report.preCommit.via).toBe("husky");
    expect(existsSync(join(dir, ".husky", "pre-commit"))).toBe(true);
  });

  it("should report not-installed when no .git/ or .husky/ directory exists", async () => {
    const report = await installHooks(dir);
    expect(report.preCommit.installed).toBe(false);
  });

  it("should detect re-install of the gate as already-present", async () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    await installHooks(dir);
    const report = await installHooks(dir);
    if (report.preCommit.installed) expect(report.preCommit.action).toBe("already-present");
  });
});

describe("installSetup hooks opt-out (US-004)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-hooksopt-"));
    execFileSync("git", ["init", "-q"], { cwd: dir });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should skip hook installation entirely when hooks: false", async () => {
    const report = await runInstall(dir, { primary_user: "x", domain: "y" }, false);
    expect(report.hooks).toBe(null);
    expect(existsSync(join(dir, ".claude", "hooks"))).toBe(false);
  });

  it("should not modify .git/hooks/pre-commit when hooks: false", async () => {
    await runInstall(dir, { primary_user: "x", domain: "y" }, false);
    expect(existsSync(join(dir, ".git", "hooks", "pre-commit"))).toBe(false);
  });

  it("should populate report.hooks when hooks: true", async () => {
    const report = await runInstall(dir, { primary_user: "x", domain: "y" }, true);
    expect(report.hooks).not.toBe(null);
    expect(report.hooks?.scriptsWritten.length).toBeGreaterThan(0);
  });
});
