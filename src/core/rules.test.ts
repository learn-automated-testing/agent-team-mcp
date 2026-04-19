import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addRule, listRules } from "./rules.js";

describe("addRule", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-rules-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should save a new rule with kebab-case name", async () => {
    const result = await addRule({
      projectDir: dir,
      name: "my-rule",
      title: "My Rule",
      rules: ["Do this"],
    });
    expect(result.saved).toBe(true);
  });

  it("should reject names that are not kebab-case", async () => {
    await expect(
      addRule({ projectDir: dir, name: "My Rule", title: "x", rules: ["y"] }),
    ).rejects.toThrow(/kebab-case/);
  });

  it("should reject an empty rules array", async () => {
    await expect(
      addRule({ projectDir: dir, name: "no-rules", title: "x", rules: [] }),
    ).rejects.toThrow(/at least one rule/);
  });

  it("should skip writing when rule exists and overwrite is false", async () => {
    await addRule({ projectDir: dir, name: "r", title: "X", rules: ["a"] });
    const second = await addRule({ projectDir: dir, name: "r", title: "Y", rules: ["b"] });
    expect(second.alreadyExisted).toBe(true);
  });

  it("should replace the file when overwrite is true", async () => {
    await addRule({ projectDir: dir, name: "r", title: "X", rules: ["first"] });
    const second = await addRule({
      projectDir: dir,
      name: "r",
      title: "X",
      rules: ["second"],
      overwrite: true,
    });
    expect(second.saved).toBe(true);
  });

  it("should emit a YAML paths frontmatter when paths are provided", async () => {
    const result = await addRule({
      projectDir: dir,
      name: "scoped",
      title: "Scoped",
      rules: ["a"],
      paths: ["**/*.ts"],
    });
    const body = readFileSync(result.path, "utf8");
    expect(body.startsWith("---\npaths:")).toBe(true);
  });

  it("should omit frontmatter when no paths are provided", async () => {
    const result = await addRule({
      projectDir: dir,
      name: "unscoped",
      title: "Unscoped",
      rules: ["a"],
    });
    const body = readFileSync(result.path, "utf8");
    expect(body.startsWith("---")).toBe(false);
  });
});

describe("listRules", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-list-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should return total=0 when no rules directory exists", async () => {
    const result = await listRules({ projectDir: dir });
    expect(result.total).toBe(0);
  });

  it("should sort returned rules by name", async () => {
    await addRule({ projectDir: dir, name: "bravo", title: "B", rules: ["b"] });
    await addRule({ projectDir: dir, name: "alpha", title: "A", rules: ["a"] });
    const result = await listRules({ projectDir: dir });
    expect(result.rules[0].name).toBe("alpha");
  });

  it("should parse paths from frontmatter into the returned summary", async () => {
    await addRule({
      projectDir: dir,
      name: "scoped",
      title: "S",
      rules: ["r"],
      paths: ["**/*.go"],
    });
    const result = await listRules({ projectDir: dir });
    expect(result.rules[0].paths).toEqual(["**/*.go"]);
  });
});
