import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureLesson, listLessons } from "./lessons.js";

function seedProject(dir: string, contextBody = "# Project context\n"): void {
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", "context.md"), contextBody, "utf8");
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

describe("captureLesson (US-001 capture-lesson-tool)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-lessons-"));
    seedProject(dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should append a bullet under '## Learned conventions' in context.md", async () => {
    await captureLesson({ projectDir: dir, category: "code", lesson: "L1", reason: "R1" });
    const ctx = await readFile(join(dir, ".claude", "context.md"), "utf8");
    expect(ctx).toContain("## Learned conventions");
    expect(ctx).toContain("L1");
    expect(ctx).toContain("R1");
  });

  it("should append a structured entry to lessons[] in .skillsrepo.json", async () => {
    await captureLesson({ projectDir: dir, category: "tooling", lesson: "L2", reason: "R2" });
    const meta = JSON.parse(await readFile(join(dir, ".claude", ".skillsrepo.json"), "utf8"));
    expect(meta.lessons.length).toBe(1);
    expect(meta.lessons[0]).toMatchObject({ category: "tooling", lesson: "L2", reason: "R2" });
    expect(typeof meta.lessons[0].capturedAt).toBe("string");
  });

  it("should create the '## Learned conventions' section when absent", async () => {
    rmSync(join(dir, ".claude", "context.md"));
    writeFileSync(join(dir, ".claude", "context.md"), "# Foo\n\nBody only.\n", "utf8");
    await captureLesson({ projectDir: dir, category: "code", lesson: "X", reason: "Y" });
    const ctx = await readFile(join(dir, ".claude", "context.md"), "utf8");
    expect(ctx).toContain("## Learned conventions");
    expect(ctx).toContain("Body only.");
  });
});

describe("listLessons (US-002 list-lessons-tool)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-lessons-list-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should return total=0 with empty lessons[] when none captured", async () => {
    seedProject(dir);
    const out = await listLessons({ projectDir: dir });
    expect(out.total).toBe(0);
    expect(out.lessons).toEqual([]);
  });

  it("should return [] (not error) when .skillsrepo.json is missing", async () => {
    const out = await listLessons({ projectDir: dir });
    expect(out.total).toBe(0);
    expect(out.lessons).toEqual([]);
  });

  it("should return the structured lessons array after capture", async () => {
    seedProject(dir);
    await captureLesson({ projectDir: dir, category: "code", lesson: "L-A", reason: "R-A" });
    await captureLesson({ projectDir: dir, category: "domain", lesson: "L-B", reason: "R-B" });
    const out = await listLessons({ projectDir: dir });
    expect(out.total).toBe(2);
    expect(out.lessons.map((l) => l.lesson).sort()).toEqual(["L-A", "L-B"]);
  });
});

describe("captureLesson reason validation (US-003 reason-required)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-lessons-reason-"));
    seedProject(dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should reject an empty reason with an error naming 'reason'", async () => {
    await expect(
      captureLesson({ projectDir: dir, category: "code", lesson: "X", reason: "" }),
    ).rejects.toThrow(/reason/i);
  });

  it("should reject a whitespace-only reason", async () => {
    await expect(
      captureLesson({ projectDir: dir, category: "code", lesson: "X", reason: "   " }),
    ).rejects.toThrow(/reason/i);
  });

  it("should not write context.md or skillsrepo.json when reason validation fails", async () => {
    const ctxBefore = await readFile(join(dir, ".claude", "context.md"), "utf8");
    const metaBefore = await readFile(join(dir, ".claude", ".skillsrepo.json"), "utf8");
    await expect(
      captureLesson({ projectDir: dir, category: "code", lesson: "X", reason: "" }),
    ).rejects.toThrow();
    const ctxAfter = await readFile(join(dir, ".claude", "context.md"), "utf8");
    const metaAfter = await readFile(join(dir, ".claude", ".skillsrepo.json"), "utf8");
    expect(ctxAfter).toBe(ctxBefore);
    expect(metaAfter).toBe(metaBefore);
  });
});

describe("captureLesson dedupe (US-004 dedupe-lessons)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-lessons-dedupe-"));
    seedProject(dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should detect an exact-text duplicate and not write twice", async () => {
    await captureLesson({ projectDir: dir, category: "code", lesson: "X", reason: "R" });
    const second = await captureLesson({ projectDir: dir, category: "code", lesson: "X", reason: "R" });
    expect(second.duplicate).toBe(true);
    const meta = JSON.parse(await readFile(join(dir, ".claude", ".skillsrepo.json"), "utf8"));
    expect(meta.lessons.length).toBe(1);
  });

  it("should detect a case-different duplicate", async () => {
    await captureLesson({ projectDir: dir, category: "code", lesson: "Always Validate Input", reason: "R" });
    const second = await captureLesson({ projectDir: dir, category: "code", lesson: "always validate input", reason: "R" });
    expect(second.duplicate).toBe(true);
  });

  it("should detect a whitespace-different duplicate", async () => {
    await captureLesson({ projectDir: dir, category: "code", lesson: "  some lesson  ", reason: "R" });
    const second = await captureLesson({ projectDir: dir, category: "code", lesson: "some lesson", reason: "R" });
    expect(second.duplicate).toBe(true);
  });

  it("should treat punctuation-different text as distinct lessons", async () => {
    await captureLesson({ projectDir: dir, category: "code", lesson: "use vitest", reason: "R" });
    const second = await captureLesson({ projectDir: dir, category: "code", lesson: "use vitest!", reason: "R" });
    expect(second.duplicate).toBe(false);
    expect(second.saved).toBe(true);
  });
});
