import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promoteAsLesson, promoteAsRule } from "./promote.js";

function seedProject(dir: string): void {
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", "context.md"), "# Project context\n", "utf8");
  writeFileSync(
    join(dir, ".claude", ".skillsrepo.json"),
    JSON.stringify({
      version: "0.4.0",
      installedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      answers: {},
      agents: [],
      skills: [],
    }),
    "utf8",
  );
}

describe("promoteAsRule (US-002 promote-memory-tool, target=rule)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-promote-rule-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should write the promoted rule to .claude/rules/<name>.md", async () => {
    const result = await promoteAsRule({
      projectDir: dir,
      name: "promoted-rule",
      title: "Promoted Rule",
      rules: ["always X"],
    });
    expect(result.saved).toBe(true);
    expect(existsSync(join(dir, ".claude", "rules", "promoted-rule.md"))).toBe(true);
  });

  it("should reject names that are not kebab-case", async () => {
    await expect(
      promoteAsRule({ projectDir: dir, name: "Bad Name", title: "X", rules: ["a"] }),
    ).rejects.toThrow(/kebab-case/);
  });

  it("should preserve scoped paths in the rule frontmatter", async () => {
    const result = await promoteAsRule({
      projectDir: dir,
      name: "scoped",
      title: "Scoped",
      rules: ["a"],
      paths: ["**/*.ts"],
    });
    const body = await readFile(result.path, "utf8");
    expect(body.startsWith("---\npaths:")).toBe(true);
    expect(body).toContain("**/*.ts");
  });
});

describe("promoteAsLesson (US-002 promote-memory-tool, target=lesson)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-promote-lesson-"));
    seedProject(dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should append a bullet to context.md and an entry to .skillsrepo.json", async () => {
    await promoteAsLesson({
      projectDir: dir,
      category: "code",
      lesson: "Promoted lesson",
      reason: "It matters",
    });
    const ctx = await readFile(join(dir, ".claude", "context.md"), "utf8");
    expect(ctx).toContain("Promoted lesson");
    const meta = JSON.parse(await readFile(join(dir, ".claude", ".skillsrepo.json"), "utf8"));
    expect(meta.lessons.length).toBe(1);
    expect(meta.lessons[0].lesson).toBe("Promoted lesson");
  });

  it("should reject when reason is empty (validation propagates from captureLesson)", async () => {
    await expect(
      promoteAsLesson({ projectDir: dir, category: "code", lesson: "X", reason: "" }),
    ).rejects.toThrow(/reason/i);
  });
});
