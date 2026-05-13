import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { archiveRule, mergeRules } from "./rule-ops.js";
import { addRule } from "./rules.js";

describe("mergeRules (US-002 merge-rules-tool)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-merge-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should concatenate every bullet from each source into the target", async () => {
    await addRule({ projectDir: dir, name: "src-a", title: "A", rules: ["alpha-rule"] });
    await addRule({ projectDir: dir, name: "src-b", title: "B", rules: ["bravo-rule"] });
    const result = await mergeRules({ projectDir: dir, into: "merged", from: ["src-a", "src-b"] });
    const body = await readFile(result.path, "utf8");
    expect(body).toContain("alpha-rule");
    expect(body).toContain("bravo-rule");
  });

  it("should union the source paths into the target frontmatter", async () => {
    await addRule({ projectDir: dir, name: "src-a", title: "A", rules: ["a"], paths: ["**/*.ts"] });
    await addRule({ projectDir: dir, name: "src-b", title: "B", rules: ["b"], paths: ["**/*.tsx"] });
    const result = await mergeRules({ projectDir: dir, into: "merged", from: ["src-a", "src-b"] });
    expect(result.unionPaths).toEqual(expect.arrayContaining(["**/*.ts", "**/*.tsx"]));
  });

  it("should delete the source files after merging", async () => {
    await addRule({ projectDir: dir, name: "src-a", title: "A", rules: ["a"] });
    await addRule({ projectDir: dir, name: "src-b", title: "B", rules: ["b"] });
    await mergeRules({ projectDir: dir, into: "merged", from: ["src-a", "src-b"] });
    expect(existsSync(join(dir, ".claude", "rules", "src-a.md"))).toBe(false);
    expect(existsSync(join(dir, ".claude", "rules", "src-b.md"))).toBe(false);
  });

  it("should error when a source rule is missing", async () => {
    await addRule({ projectDir: dir, name: "src-a", title: "A", rules: ["a"] });
    await expect(
      mergeRules({ projectDir: dir, into: "merged", from: ["src-a", "missing"] }),
    ).rejects.toThrow(/missing/);
  });

  it("should error when 'from' has fewer than 2 entries", async () => {
    await addRule({ projectDir: dir, name: "only", title: "X", rules: ["a"] });
    await expect(
      mergeRules({ projectDir: dir, into: "merged", from: ["only"] }),
    ).rejects.toThrow(/at least 2/);
  });

  it("should error when target exists and overwrite is not set", async () => {
    await addRule({ projectDir: dir, name: "src-a", title: "A", rules: ["a"] });
    await addRule({ projectDir: dir, name: "src-b", title: "B", rules: ["b"] });
    await addRule({ projectDir: dir, name: "merged", title: "M", rules: ["x"] });
    await expect(
      mergeRules({ projectDir: dir, into: "merged", from: ["src-a", "src-b"] }),
    ).rejects.toThrow(/already exists/);
  });
});

describe("archiveRule (US-003 archive-rule-tool)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-archive-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should move the rule to .claude/rules/archive/<name>.md", async () => {
    await addRule({ projectDir: dir, name: "old-rule", title: "Old", rules: ["legacy"] });
    const result = await archiveRule({ projectDir: dir, name: "old-rule" });
    expect(result.archived).toBe(true);
    expect(existsSync(join(dir, ".claude", "rules", "old-rule.md"))).toBe(false);
    expect(existsSync(join(dir, ".claude", "rules", "archive", "old-rule.md"))).toBe(true);
  });

  it("should error when the source rule is missing", async () => {
    await expect(
      archiveRule({ projectDir: dir, name: "nonexistent" }),
    ).rejects.toThrow(/not found/);
  });

  it("should reject names that are not kebab-case", async () => {
    await expect(
      archiveRule({ projectDir: dir, name: "Bad Name" }),
    ).rejects.toThrow(/kebab-case/);
  });

  it("should preserve the file contents byte-for-byte across the move", async () => {
    const add = await addRule({
      projectDir: dir,
      name: "preserved",
      title: "Preserved",
      rules: ["keep me"],
      paths: ["**/*.ts"],
    });
    const before = await readFile(add.path, "utf8");
    const result = await archiveRule({ projectDir: dir, name: "preserved" });
    const after = await readFile(result.to, "utf8");
    expect(after).toBe(before);
  });
});
