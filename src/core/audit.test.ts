import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditRules } from "./audit.js";
import { addRule } from "./rules.js";

describe("auditRules", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-audit-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should report health=good when there are zero rules", async () => {
    const result = await auditRules(dir);
    expect(result.health).toBe("good");
  });

  it("should not treat YAML paths entries as duplicate bullets", async () => {
    await addRule({ projectDir: dir, name: "a", title: "A", rules: ["alpha"], paths: ["**/*.ts"] });
    await addRule({ projectDir: dir, name: "b", title: "B", rules: ["beta"], paths: ["**/*.ts"] });
    const result = await auditRules(dir);
    expect(result.duplicates.length).toBe(0);
  });

  it("should flag a real duplicate bullet across two files", async () => {
    await addRule({ projectDir: dir, name: "a", title: "A", rules: ["same rule text"] });
    await addRule({ projectDir: dir, name: "b", title: "B", rules: ["same rule text"] });
    const result = await auditRules(dir);
    expect(result.duplicates.length).toBe(1);
  });

  it("should flag rules whose paths match no file in the repo", async () => {
    await addRule({
      projectDir: dir,
      name: "stale",
      title: "S",
      rules: ["r"],
      paths: ["**/*.nonexistent"],
    });
    const result = await auditRules(dir);
    expect(result.stale.length).toBe(1);
  });

  it("should count scoped rules correctly", async () => {
    await addRule({ projectDir: dir, name: "scoped", title: "S", rules: ["r"], paths: ["**/*.ts"] });
    await addRule({ projectDir: dir, name: "unscoped", title: "U", rules: ["r"] });
    const result = await auditRules(dir);
    expect(result.scoped).toBe(1);
  });

  it("should consider a scoped rule non-stale when the project contains a matching file", async () => {
    const ruleName = "ts-rule";
    await addRule({
      projectDir: dir,
      name: ruleName,
      title: "TS",
      rules: ["r"],
      paths: ["**/*.ts"],
    });
    writeFileSync(join(dir, "example.ts"), "export const x = 1;\n");
    const result = await auditRules(dir);
    expect(result.stale.find((s) => s.name === ruleName)).toBeUndefined();
  });

  it("should evaluate overlapping path globs against a single cached file list", async () => {
    writeFileSync(join(dir, "a.ts"), "export const a = 1;\n");
    writeFileSync(join(dir, "b.ts"), "export const b = 1;\n");
    writeFileSync(join(dir, "c.tsx"), "export const c = 1;\n");
    await addRule({ projectDir: dir, name: "ts-rule", title: "TS", rules: ["r"], paths: ["**/*.ts"] });
    await addRule({ projectDir: dir, name: "tsx-rule", title: "TSX", rules: ["r"], paths: ["**/*.tsx"] });
    await addRule({ projectDir: dir, name: "both-rule", title: "B", rules: ["r"], paths: ["**/*.ts", "**/*.tsx"] });
    const result = await auditRules(dir);
    expect(result.stale).toEqual([]);
    expect(result.scoped).toBe(3);
  });
});
