import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateAuditReport } from "./audit-report.js";
import { addRule } from "./rules.js";

describe("generateAuditReport (EPIC-011 US-001)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-auditreport-"));
    // The implementation assumes `.claude/` exists (install_setup is the prerequisite);
    // create it so tests exercise the report generation, not the missing-dir error path.
    mkdirSync(join(dir, ".claude"), { recursive: true });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should write a self-contained HTML file at .claude/audit-report.html", async () => {
    const result = await generateAuditReport(dir);
    expect(result.path).toBe(join(dir, ".claude", "audit-report.html"));
    expect(existsSync(result.path)).toBe(true);
    expect(result.bytes).toBeGreaterThan(100);
  });

  it("should produce a valid-looking HTML document with inline styles", async () => {
    const result = await generateAuditReport(dir);
    const body = await readFile(result.path, "utf8");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("<html");
    expect(body).toContain("<style>");
    expect(body).toContain("</html>");
  });

  it("should include the rule audit summary heading", async () => {
    await addRule({ projectDir: dir, name: "demo", title: "Demo", rules: ["a"] });
    const result = await generateAuditReport(dir);
    const body = await readFile(result.path, "utf8");
    expect(body).toContain("Rules");
    expect(body).toContain("Total:");
  });

  it("should reference no external scripts or stylesheets in the body", async () => {
    const result = await generateAuditReport(dir);
    const body = await readFile(result.path, "utf8");
    // No CDN-style src= / href= pointing at http(s) URLs.
    expect(body).not.toMatch(/src\s*=\s*["']https?:\/\//i);
    expect(body).not.toMatch(/href\s*=\s*["']https?:\/\//i);
    // No <link rel="stylesheet" ...> at all (everything should be inline <style>).
    expect(body).not.toMatch(/<link\b[^>]*\bstylesheet\b/i);
  });

  it("should be idempotent across runs (regenerable to the same shape)", async () => {
    const first = await generateAuditReport(dir);
    const firstBody = await readFile(first.path, "utf8");
    const second = await generateAuditReport(dir);
    const secondBody = await readFile(second.path, "utf8");
    // The generated-at timestamp differs but the structure should not.
    const stripTimestamp = (s: string): string => s.replace(/Generated[^<]*</g, "Generated <");
    expect(stripTimestamp(firstBody)).toBe(stripTimestamp(secondBody));
  });
});
