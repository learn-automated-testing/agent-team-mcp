import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mineMemory } from "./memory-mine.js";
import { addRule } from "./rules.js";

describe("mineMemory memoryDir allowlist", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-mine-allow-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should reject memoryDir outside ~/.claude/projects and the projectDir", async () => {
    await expect(
      mineMemory({ projectDir: dir, memoryDir: "/etc" }),
    ).rejects.toThrow(/not under any allowed root/);
  });

  it("should accept memoryDir under the projectDir", async () => {
    const result = await mineMemory({ projectDir: dir, memoryDir: join(dir, "memory") });
    expect(result.memoryExists).toBe(false);
  });
});

describe("mineMemory dedupe", () => {
  let dir: string;
  let memDir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-mine-dedupe-"));
    memDir = join(dir, "memory");
    mkdirSync(memDir, { recursive: true });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should not push a candidate whose text is already captured by a substring-matching rule bullet", async () => {
    await addRule({
      projectDir: dir,
      name: "existing",
      title: "Existing",
      rules: ["never commit secrets or api keys to version control"],
    });
    writeFileSync(
      join(memDir, "notes.md"),
      "- never commit secrets or api keys to version control ever\n",
    );

    const result = await mineMemory({ projectDir: dir, memoryDir: memDir });

    expect(result.candidates).toEqual([]);
    expect(result.alreadyCaptured).toBe(1);
  });

  it("should still surface unique candidates when another candidate is a duplicate", async () => {
    await addRule({
      projectDir: dir,
      name: "existing",
      title: "Existing",
      rules: ["never commit secrets or api keys to version control"],
    });
    writeFileSync(
      join(memDir, "notes.md"),
      [
        "- never commit secrets or api keys to version control ever",
        "- always wrap fetch calls in try catch with operation name",
      ].join("\n") + "\n",
    );

    const result = await mineMemory({ projectDir: dir, memoryDir: memDir });

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].text).toMatch(/wrap fetch calls/);
    expect(result.alreadyCaptured).toBe(1);
  });
});
