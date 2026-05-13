import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateWorkflowReport } from "./workflow-report.js";

interface StorySpec {
  prd: string;
  prdTitle?: string;
  epic: string;
  story: string;
  body: string;
}

function writeStory(root: string, spec: StorySpec): string {
  const dir = join(root, "docs", "requirements", spec.prd, spec.epic);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${spec.story}.md`);
  writeFileSync(path, spec.body, "utf8");

  // Drop a tiny PRD file so the report has a PRD title to display.
  const prdDir = join(root, "docs", "requirements", spec.prd);
  const prdFile = join(prdDir, `${spec.prd}.md`);
  if (!existsSync(prdFile)) {
    const title = spec.prdTitle ?? spec.prd;
    // Include a PRD-level Open questions section on PRD-100-alpha so the
    // questions-page test has a PRD-sourced question to assert against.
    const questionsBlock = spec.prd === "PRD-100-alpha"
      ? "\n\n## Open questions\n\n- Will the retention window be 30d or 90d?\n"
      : "";
    writeFileSync(
      prdFile,
      `---\nid: ${spec.prd}\n---\n\n# ${spec.prd} — ${title}\n${questionsBlock}`,
      "utf8",
    );
  }
  return path;
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

const FIXTURE: StorySpec[] = [
  {
    prd: "PRD-100-alpha",
    prdTitle: "alpha PRD",
    epic: "EPIC-200-alpha-one",
    story: "US-001-draft-card",
    body: `---\nid: US-001\nepic: EPIC-200-alpha-one\npriority: must-have\nstatus: draft\ntesting: [unit]\n---\n\n# US-001 — draft card title\n\nThis story has a richer body so we can test inline rendering.\n\n## Acceptance criteria\n\n- [ ] Unchecked AC about reading \`config.json\`.\n- [x] Checked AC about handling **important** edge cases.\n\n## Notes\n\nA short paragraph with *italics* and a [relative link](./README.md).`,
  },
  {
    prd: "PRD-100-alpha",
    prdTitle: "alpha PRD",
    epic: "EPIC-200-alpha-one",
    story: "US-002-ready-card",
    body: `---\nid: US-002\nepic: EPIC-200-alpha-one\npriority: should-have\nstatus: ready\ntesting: [unit, integration]\n---\n\n# US-002 — ready card title\n\nbody.\n\n## Open questions\n\n- Should we cap retries at 3 or make it configurable?\n- What happens when \`config.json\` is missing?`,
  },
  {
    prd: "PRD-100-alpha",
    prdTitle: "alpha PRD",
    epic: "EPIC-201-alpha-two",
    story: "US-003-in-progress-card",
    body: `---\nid: US-003\nepic: EPIC-201-alpha-two\npriority: could-have\nstatus: in_progress\ntesting: [unit]\n---\n\n# US-003 — in-progress card title\n\nbody.`,
  },
  {
    prd: "PRD-101-beta",
    prdTitle: "beta PRD",
    epic: "EPIC-202-beta-one",
    story: "US-004-done-card",
    body: `---\nid: US-004\nepic: EPIC-202-beta-one\npriority: must-have\nstatus: done\ntesting: [unit]\n---\n\n# US-004 — done card title\n\nbody.`,
  },
  {
    prd: "PRD-101-beta",
    prdTitle: "beta PRD",
    epic: "EPIC-202-beta-one",
    story: "US-005-blocked-card",
    body: `---\nid: US-005\nepic: EPIC-202-beta-one\npriority: must-have\nstatus: blocked\ntesting: [unit]\n---\n\n# US-005 — blocked card title\n\nbody.`,
  },
  {
    prd: "PRD-101-beta",
    prdTitle: "beta PRD",
    epic: "EPIC-202-beta-one",
    story: "US-006-malformed-card",
    body: `# US-006 — malformed card title\n\nNo frontmatter at all on this one.\n`,
  },
];

describe("generateWorkflowReport (EPIC-014 US-001)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "agent-team-workflow-"));
    for (const spec of FIXTURE) writeStory(dir, spec);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should write a self-contained HTML file at .claude/workflow-report.html", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    expect(result.path).toBe(join(dir, ".claude", "workflow-report.html"));
    expect(existsSync(result.path)).toBe(true);
  });

  it("should return totals matching the spec tree on disk", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    // PRD-100-alpha contributes 1, US-002 contributes 2 → 3 open questions total.
    expect(result.totals).toEqual({ prds: 2, epics: 3, stories: 6, openQuestions: 3 });
  });

  it("should include every story id in the rendered HTML", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    const body = await readFile(result.path, "utf8");
    for (const id of ["US-001", "US-002", "US-003", "US-004", "US-005", "US-006"]) {
      expect(body).toContain(id);
    }
  });

  it("should place the malformed story in the unparsed column", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    const body = await readFile(result.path, "utf8");
    const unparsedSection = body.match(/<section class="column column-unparsed">([\s\S]*?)<\/section>/);
    expect(unparsedSection).not.toBeNull();
    expect(unparsedSection![1]).toContain("US-006");
  });

  it("should place each well-formed story in its declared status column", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    const body = await readFile(result.path, "utf8");

    // Collect the inner HTML of every column of each status (each epic produces its
    // own kanban, so a status may appear in multiple columns across the document).
    function bodiesOfStatus(status: string): string[] {
      const re = new RegExp(`<section class="column column-${status}">([\\s\\S]*?)<\\/section>`, "g");
      return Array.from(body.matchAll(re), (m) => m[1]);
    }

    function hasIdInSomeColumn(status: string, id: string): boolean {
      return bodiesOfStatus(status).some((b) => b.includes(id));
    }

    expect(hasIdInSomeColumn("draft", "US-001")).toBe(true);
    expect(hasIdInSomeColumn("ready", "US-002")).toBe(true);
    expect(hasIdInSomeColumn("in_progress", "US-003")).toBe(true);
    expect(hasIdInSomeColumn("done", "US-004")).toBe(true);
    expect(hasIdInSomeColumn("blocked", "US-005")).toBe(true);

    // Cross-check: a story must NOT appear under a wrong status column.
    expect(hasIdInSomeColumn("done", "US-001")).toBe(false);
    expect(hasIdInSomeColumn("draft", "US-004")).toBe(false);
  });

  it("should display the title (without the US-NNN prefix) and priority on each card", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    const body = await readFile(result.path, "utf8");
    expect(body).toContain("draft card title");
    // The bare description should appear without the "US-001 — " prefix in card-title.
    const cardTitleMatch = body.match(/<p class="card-title">[^<]*draft card title[^<]*<\/p>/);
    expect(cardTitleMatch).not.toBeNull();
    expect(cardTitleMatch![0]).not.toContain("US-001 —");
    expect(body).toContain("must-have");
    expect(body).toContain("should-have");
  });

  it("should give every card a relative href to a generated story page (not the raw .md)", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    const body = await readFile(result.path, "utf8");
    // Card href now points at the rendered story page sibling under .claude/.
    expect(body).toMatch(
      /href="\.\/workflow-report-stories\/PRD-100-alpha__EPIC-200-alpha-one__US-001-draft-card\.html"/,
    );
    // The card MUST NOT link directly to the .md file any more — that's the
    // raw-markdown source link, which lives only on the story page.
    expect(body).not.toMatch(/href="[^"]*US-001-draft-card\.md"/);
    // Must not be an absolute path leaking the local filesystem.
    expect(body).not.toMatch(/href="\/(?:Users|home)\//);
  });

  it("should write an open-questions page with one entry per bullet across PRD/epic/story", async () => {
    await generateWorkflowReport({ projectDir: dir });
    const questionsPath = join(dir, ".claude", "workflow-report-questions.html");
    expect(existsSync(questionsPath)).toBe(true);

    const page = await readFile(questionsPath, "utf8");

    // Each fixture question text must show up exactly once.
    expect(page).toContain("retention window be 30d or 90d");
    expect(page).toContain("cap retries at 3 or make it configurable");
    expect(page).toContain("config.json"); // inline code from a question

    // Source-kind tags render correctly.
    expect(page).toMatch(/q-tag-prd[^>]*>PRD</);
    expect(page).toMatch(/q-tag-story[^>]*>STORY</);

    // Each question links to a real source under .claude/.
    expect(page).toMatch(/href="[^"]*PRD-100-alpha\.md"/);
    expect(page).toMatch(/href="workflow-report-stories\/[^"]+\.html"/);

    // The questions page links back to the main report.
    expect(page).toContain("Back to workflow report");

    // Main report header now carries a link to the questions page.
    const main = await readFile(join(dir, ".claude", "workflow-report.html"), "utf8");
    expect(main).toMatch(/href="\.\/workflow-report-questions\.html"[^>]*>Open questions:/);
  });

  it("should write a separate rendered HTML page per story under .claude/workflow-report-stories/", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    const pagesDir = join(dir, ".claude", "workflow-report-stories");
    const us001 = join(pagesDir, "PRD-100-alpha__EPIC-200-alpha-one__US-001-draft-card.html");
    const us006 = join(pagesDir, "PRD-101-beta__EPIC-202-beta-one__US-006-malformed-card.html");
    expect(existsSync(us001)).toBe(true);
    expect(existsSync(us006)).toBe(true);

    const page = await readFile(us001, "utf8");
    // The page header carries the story id + title.
    expect(page).toContain("US-001 — draft card title");
    // The rich body fixture renders: heading, checkboxes, bold, italic, link.
    expect(page).toContain("Acceptance criteria");
    expect(page).toMatch(/<input type="checkbox" disabled> Unchecked AC/);
    expect(page).toMatch(/<input type="checkbox" disabled checked> Checked AC/);
    expect(page).toMatch(/<strong>important<\/strong>/);
    expect(page).toMatch(/<em>italics<\/em>/);
    // The story page links back to the kanban + to the raw .md source.
    expect(page).toContain("Back to workflow report");
    expect(page).toMatch(/href="[^"]*US-001-draft-card\.md"/);
    // No external resources in the story page either.
    expect(page).not.toMatch(/src\s*=\s*["']https?:\/\//i);
    expect(page).not.toMatch(/href\s*=\s*["']https?:\/\/(?!.*\.md)/i);
    // Frontmatter must not leak into the rendered body.
    expect(page).not.toMatch(/<article class="body">[\s\S]*?priority:\s*must-have/);
    // result.path is unchanged — still the main kanban file.
    expect(result.path).toBe(join(dir, ".claude", "workflow-report.html"));
  });

  it("should reference no external scripts, stylesheets, fonts, or CDN URLs", async () => {
    const result = await generateWorkflowReport({ projectDir: dir });
    const body = await readFile(result.path, "utf8");
    expect(body).not.toMatch(/src\s*=\s*["']https?:\/\//i);
    expect(body).not.toMatch(/href\s*=\s*["']https?:\/\//i);
    expect(body).not.toMatch(/<link\b[^>]*\bstylesheet\b/i);
    expect(body).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
    expect(body).toContain("<style>");
  });

  it("should overwrite the file on re-run with no growth in size", async () => {
    const first = await generateWorkflowReport({ projectDir: dir });
    const firstSize = (await stat(first.path)).size;
    const second = await generateWorkflowReport({ projectDir: dir });
    const secondSize = (await stat(second.path)).size;
    expect(secondSize).toBe(firstSize);
  });

  it("should produce a sha256-identical file across runs after stripping the timestamp", async () => {
    const first = await generateWorkflowReport({ projectDir: dir });
    const firstBody = await readFile(first.path, "utf8");
    const second = await generateWorkflowReport({ projectDir: dir });
    const secondBody = await readFile(second.path, "utf8");
    const stripTimestamp = (s: string): string => s.replace(/Generated [^<]*</g, "Generated <");
    expect(sha256(stripTimestamp(firstBody))).toBe(sha256(stripTimestamp(secondBody)));
  });

  it("should mkdir -p .claude when the directory does not yet exist", async () => {
    // Fixture so far has no .claude/ — the function must create it.
    expect(existsSync(join(dir, ".claude"))).toBe(false);
    const result = await generateWorkflowReport({ projectDir: dir });
    expect(existsSync(result.path)).toBe(true);
  });

  it("should reject a projectDir outside the allowlist (path traversal)", async () => {
    const traversal = join(dir, "..", "..", "..", "..", "..", "..", "etc");
    await expect(generateWorkflowReport({ projectDir: traversal })).rejects.toThrow(
      /generateWorkflowReport\.projectDir/,
    );
  });

  it("should expose itself through the registered MCP tool wrapper", async () => {
    const { registerGenerateWorkflowReport } = await import("../tools/generateWorkflowReport.js");
    interface Captured {
      name: string;
      handler: (args: { projectDir: string }) => Promise<{ content: Array<{ type: string; text: string }> }>;
    }
    let captured: Captured | null = null;
    const fakeServer = {
      registerTool(
        name: string,
        _meta: unknown,
        handler: Captured["handler"],
      ): void {
        captured = { name, handler };
      },
    } as unknown as Parameters<typeof registerGenerateWorkflowReport>[0];
    registerGenerateWorkflowReport(fakeServer);
    expect(captured).not.toBeNull();
    expect(captured!.name).toBe("generate_workflow_report");
    const out = await captured!.handler({ projectDir: dir });
    expect(out.content[0].type).toBe("text");
    const parsed = JSON.parse(out.content[0].text) as { path: string; totals: { stories: number } };
    expect(parsed.path).toBe(join(dir, ".claude", "workflow-report.html"));
    expect(parsed.totals.stories).toBe(6);
  });
});
