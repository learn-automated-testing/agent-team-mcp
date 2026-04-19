import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findTemplate,
  installRuleFromTemplate,
  listRuleTemplatesLogic,
  loadRuleLibrary,
} from "./template-library.js";

describe("loadRuleLibrary", () => {
  it("should load at least 37 templates from the bundled library", async () => {
    const lib = await loadRuleLibrary();
    expect(lib.length).toBeGreaterThanOrEqual(37);
  });

  it("should have unique ids across the library", async () => {
    const lib = await loadRuleLibrary();
    const ids = lib.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("findTemplate", () => {
  it("should find ts-file-length by id", async () => {
    const t = await findTemplate("ts-file-length");
    expect(t?.id).toBe("ts-file-length");
  });

  it("should return null for an unknown template id", async () => {
    const t = await findTemplate("does-not-exist");
    expect(t).toBeNull();
  });
});

describe("listRuleTemplatesLogic", () => {
  it("should filter templates by category", async () => {
    const result = await listRuleTemplatesLogic({ category: "security" });
    expect(result.every((t) => t.category === "security")).toBe(true);
  });

  it("should filter templates by tag", async () => {
    const result = await listRuleTemplatesLogic({ tag: "typescript" });
    expect(result.every((t) => t.tags.includes("typescript"))).toBe(true);
  });
});

describe("installRuleFromTemplate", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-tmpl-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should substitute the max_lines answer into ts-file-length rules", async () => {
    const result = await installRuleFromTemplate({
      projectDir: dir,
      templateId: "ts-file-length",
      answers: { max_lines: "300" },
    });
    const body = readFileSync(result.addRuleResult.path, "utf8");
    expect(body).toContain("must not exceed 300 lines");
  });

  it("should reject invalid choices for a parameterised question", async () => {
    await expect(
      installRuleFromTemplate({
        projectDir: dir,
        templateId: "ts-file-length",
        answers: { max_lines: "9999" },
      }),
    ).rejects.toThrow(/must be one of/);
  });

  it("should apply the question default when an answer is missing", async () => {
    const result = await installRuleFromTemplate({
      projectDir: dir,
      templateId: "ts-file-length",
    });
    expect(result.answersUsed.max_lines).toBe("200");
  });

  it("should throw for an unknown template id", async () => {
    await expect(
      installRuleFromTemplate({
        projectDir: dir,
        templateId: "no-such-template",
      }),
    ).rejects.toThrow(/Unknown template/);
  });

  it("should respect name override when writing the rule file", async () => {
    const result = await installRuleFromTemplate({
      projectDir: dir,
      templateId: "ts-strict-typing",
      overrides: { name: "ts-strict-custom" },
    });
    expect(result.addRuleResult.path.endsWith("ts-strict-custom.md")).toBe(true);
  });
});
