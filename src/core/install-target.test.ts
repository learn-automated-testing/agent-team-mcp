import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

async function runInstall(dir: string, answers: Answers) {
  const fp = tsFingerprint(dir);
  const plan = recommendSetup(fp);
  return installSetup(plan, fp, { outDir: dir, overwrite: false, answers, hooks: false });
}

describe("installSetup target_tooling", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-target-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should default to 'both' when target_tooling is missing", async () => {
    const report = await runInstall(dir, { primary_user: "devs", domain: "x" });
    expect(report.target).toBe("both");
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, ".github", "copilot-instructions.md"))).toBe(true);
  });

  it("should write only the .claude tree when target_tooling=claude", async () => {
    const report = await runInstall(dir, {
      target_tooling: "claude",
      primary_user: "devs",
      domain: "x",
    });
    expect(report.target).toBe("claude");
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "agents", "developer.md"))).toBe(true);
    expect(existsSync(join(dir, ".github"))).toBe(false);
  });

  it("should write only the .github tree when target_tooling=copilot", async () => {
    const report = await runInstall(dir, {
      target_tooling: "copilot",
      primary_user: "devs",
      domain: "x",
    });
    expect(report.target).toBe("copilot");
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(dir, ".claude", "agents"))).toBe(false);
    expect(existsSync(join(dir, ".claude", "skills"))).toBe(false);
    expect(existsSync(join(dir, ".github", "copilot-instructions.md"))).toBe(true);
    expect(existsSync(join(dir, ".github", "agents", "developer.agent.md"))).toBe(true);
    expect(existsSync(join(dir, ".github", "skills", "prd", "SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".github", "context.md"))).toBe(true);
  });

  it("should write both trees when target_tooling=both", async () => {
    const report = await runInstall(dir, {
      target_tooling: "both",
      primary_user: "devs",
      domain: "x",
    });
    expect(report.target).toBe("both");
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "agents", "developer.md"))).toBe(true);
    expect(existsSync(join(dir, ".github", "copilot-instructions.md"))).toBe(true);
    expect(existsSync(join(dir, ".github", "instructions", "typescript.instructions.md"))).toBe(true);
    expect(existsSync(join(dir, ".github", "instructions", "tests.instructions.md"))).toBe(true);
    // bridge mode should NOT mirror the agents under .github/agents/
    expect(existsSync(join(dir, ".github", "agents"))).toBe(false);
  });

  it("should drop the 'isolation:' frontmatter and rewrite .claude/ paths in copilot agent files", async () => {
    await runInstall(dir, {
      target_tooling: "copilot",
      primary_user: "devs",
      domain: "x",
    });
    const body = await readFile(join(dir, ".github", "agents", "developer.agent.md"), "utf8");
    expect(body).not.toMatch(/^isolation:/m);
    expect(body).toContain(".github/skills/");
    expect(body).not.toContain(".claude/skills/");
  });

  it("should always write MCP-internal state under .claude/, regardless of target", async () => {
    await runInstall(dir, {
      target_tooling: "copilot",
      primary_user: "devs",
      domain: "x",
    });
    expect(existsSync(join(dir, ".claude", "state.json"))).toBe(true);
    expect(existsSync(join(dir, ".claude", ".skillsrepo.json"))).toBe(true);
  });
});

describe("CLAUDE.md template (EPIC-001 US-001)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-claudemd-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should write CLAUDE.md at the repo root after install", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
  });

  it("should include the @.claude/context.md import directive", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    const body = await readFile(join(dir, "CLAUDE.md"), "utf8");
    expect(body).toContain("@.claude/context.md");
  });

  it("should reference .claude/rules/ as the home for path-scoped rules", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    const body = await readFile(join(dir, "CLAUDE.md"), "utf8");
    expect(body).toContain(".claude/rules");
  });

  it("should keep CLAUDE.md under Anthropic's 200-line ceiling", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    const body = await readFile(join(dir, "CLAUDE.md"), "utf8");
    expect(body.split("\n").length).toBeLessThan(200);
  });

  it("should record CLAUDE.md under report.written with kind 'claude-md'", async () => {
    const report = await runInstall(dir, { primary_user: "devs", domain: "x" });
    const claudeMdEntry = report.written.find((w) => w.kind === "claude-md");
    expect(claudeMdEntry).toBeDefined();
    expect(claudeMdEntry?.path).toBe(join(dir, "CLAUDE.md"));
  });
});

describe(".claude/rules/ directory (EPIC-001 US-002)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-rulesdir-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should create .claude/rules/ even with no rules installed", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    expect(existsSync(join(dir, ".claude", "rules"))).toBe(true);
  });

  it("should record the rules directory under report.written", async () => {
    const report = await runInstall(dir, { primary_user: "devs", domain: "x" });
    const rulesEntry = report.written.find((w) => w.kind === "rules-dir");
    expect(rulesEntry).toBeDefined();
  });
});

describe("per-skill references/ and examples/ subdirs (EPIC-001 US-003)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-skillsubdirs-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should create references/ and examples/ for every installed skill", async () => {
    const report = await runInstall(dir, { primary_user: "devs", domain: "x" });
    const skillEntries = report.written.filter((w) => w.kind === "skill" || w.kind === "workflow");
    expect(skillEntries.length).toBeGreaterThan(0);
    for (const entry of skillEntries) {
      const skillDir = join(dir, ".claude", "skills", entry.name);
      expect(existsSync(join(skillDir, "references"))).toBe(true);
      expect(existsSync(join(skillDir, "examples"))).toBe(true);
    }
  });
});

describe("CLAUDE.md no-clobber (EPIC-001 US-004)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-noclobber-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should not overwrite an existing CLAUDE.md when overwrite=false", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    const handWritten = "# Hand-written CLAUDE.md — do not touch\n";
    const fs = await import("node:fs/promises");
    await fs.writeFile(join(dir, "CLAUDE.md"), handWritten, "utf8");
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    const after = await readFile(join(dir, "CLAUDE.md"), "utf8");
    expect(after).toBe(handWritten);
  });

  it("should record the skipped CLAUDE.md in report.skipped with a reason", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    const report = await runInstall(dir, { primary_user: "devs", domain: "x" });
    const skipped = report.skipped.find((s) => s.kind === "claude-md");
    expect(skipped).toBeDefined();
    expect(skipped?.reason).toMatch(/overwrite/i);
  });
});

describe("standalone copilot points at .claude/state.json (EPIC-005 US-002)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-standalonestate-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should include the literal '.claude/state.json' string in the standalone copilot instructions", async () => {
    await runInstall(dir, { target_tooling: "copilot", primary_user: "devs", domain: "x" });
    const body = await readFile(join(dir, ".github", "copilot-instructions.md"), "utf8");
    // TODO(prd): EPIC-005 US-002 says the standalone copilot-instructions template
    // must contain the literal string `.claude/state.json` so that copilot-only
    // users have a pointer to the only file outside .github/. The current
    // templates/copilot-instructions-standalone.md.tmpl does not include it.
    // Leaving the failing assertion in to surface the implementation gap.
    expect(body).toContain(".claude/state.json");
  });
});

function pythonFingerprint(dir: string): Fingerprint {
  return {
    projectDir: dir,
    projectName: "py-demo",
    languages: { python: 100 },
    primaryLanguage: "python",
    packageManagers: ["pip"],
    frameworks: [],
    testFrameworks: [],
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

describe("starter rule pack install (EPIC-015 US-001)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-rulepack-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should install python rules and skip ts rules when fingerprint says python", async () => {
    const fp = pythonFingerprint(dir);
    const plan = recommendSetup(fp);
    await installSetup(plan, fp, {
      outDir: dir,
      overwrite: false,
      answers: { primary_user: "devs", domain: "x" },
      hooks: false,
    });
    expect(existsSync(join(dir, ".claude", "rules", "py-type-hints.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "rules", "no-secrets-in-code.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "rules", "ts-strict-typing.md"))).toBe(false);
  });

  it("should install typescript rules and skip pytest rules when fingerprint says typescript", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    expect(existsSync(join(dir, ".claude", "rules", "ts-strict-typing.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "rules", "js-async-await.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "rules", "pytest-fixtures.md"))).toBe(false);
  });

  it("should throw with a clear error when a planned rule id is missing from the library", async () => {
    const fp = tsFingerprint(dir);
    const plan = recommendSetup(fp);
    const bogusId = "does-not-exist-in-library";
    plan.rules.push({ id: bogusId, reason: "test", confidence: "high" });
    await expect(
      installSetup(plan, fp, {
        outDir: dir,
        overwrite: false,
        answers: { primary_user: "devs", domain: "x" },
        hooks: false,
      }),
    ).rejects.toThrow(bogusId);
  });
});

describe("report.warnings populated on stale-skip (EPIC-005 US-003)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-warnings-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // TODO(prd): EPIC-005 US-003 says installSetup should populate `report.warnings`
  // with entries for files the plan would have written but skipped. The current
  // InstallReport type has no `warnings` field, only `written` / `skipped`.
  // Skipping this assertion until the warnings field is added.
  it.skip("should add an entry to report.warnings for each skipped-but-stale file", async () => {
    // Placeholder — see TODO above.
  });
});
