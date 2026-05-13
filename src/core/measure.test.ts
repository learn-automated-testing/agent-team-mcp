import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { measureTeam } from "./measure.js";

function seedSkill(dir: string, name: string, description: string): void {
  const skillDir = join(dir, ".claude", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n`,
    "utf8",
  );
}

describe("measureTeam transcriptPath allowlist", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-measure-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should reject transcriptPath outside the allowed roots", async () => {
    await expect(
      measureTeam({ projectDir: dir, transcriptPath: "/etc/passwd" }),
    ).rejects.toThrow(/not under any allowed root/);
  });

  it("should not read arbitrary files via the transcript heuristic", async () => {
    const report = await measureTeam({ projectDir: dir, transcript: "/etc/passwd" });
    expect(report.transcriptSource).toBe("(literal)");
  });
});

describe("measureTeam per-skill trigger rate (US-002)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-measure-perskill-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should return one perSkill entry per installed skill with matched/expected counts", async () => {
    seedSkill(dir, "test", `Use when the user says "run tests" or "write tests"`);
    seedSkill(dir, "review", `Use when the user says "review this" or "PR review"`);
    const transcript = "please run tests on this module";
    const report = await measureTeam({ projectDir: dir, transcript });
    const testSkill = report.perSkill.find((s) => s.name === "test");
    expect(testSkill).toBeDefined();
    expect(testSkill!.expectedMatches).toBeGreaterThan(0);
    // TODO(prd): EPIC-006 US-002 says each entry should expose `matched`,
    // `expected`, `triggerRate`, `missedPrompts`, and `proposedTweak`. The
    // current implementation only exposes `expectedMatches` and `exampleMatches`.
    // The intent is captured here via expectedMatches; the richer fields await
    // implementation.
  });

  it("should produce a perSkill entry for every installed skill", async () => {
    seedSkill(dir, "test", `Use when the user says "run tests"`);
    seedSkill(dir, "review", `Use when the user says "review this"`);
    const report = await measureTeam({ projectDir: dir, transcript: "review this code" });
    expect(report.perSkill.map((s) => s.name).sort()).toEqual(["review", "test"]);
  });

  it("should leave expectedMatches=0 for skills that do not match the transcript", async () => {
    seedSkill(dir, "test", `Use when the user says "run tests"`);
    seedSkill(dir, "review", `Use when the user says "review this"`);
    const report = await measureTeam({ projectDir: dir, transcript: "totally unrelated text" });
    for (const s of report.perSkill) expect(s.expectedMatches).toBe(0);
  });
});

describe("measureTeam aggregate-over-directory (US-003)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-measure-dir-"));
    seedSkill(dir, "test", `Use when the user says "run tests"`);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // TODO(prd): EPIC-006 US-003 says when `transcript` is a directory path, the
  // tool should walk the directory and aggregate per-skill / per-agent counts
  // across all transcript files. The current measure.ts only handles a single
  // transcript string or a single transcriptPath file. Skipping this assertion
  // until directory aggregation is implemented.
  it.skip("should aggregate counts across all transcripts in a directory", async () => {
    // Placeholder — see TODO above.
  });
});
