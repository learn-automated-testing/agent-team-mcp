import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { renderMarkdown } from "./markdown-mini.js";
import { assertPathUnderAllowedRoots, claudeProjectsRoot } from "./path-guard.js";
import {
  renderQuestionsPage,
  renderStoryPage,
  renderWorkflowHtml,
  type OpenQuestion,
  type PrdSummary,
  type StoryCard,
  type StoryStatus,
  type WorkflowReportModel,
} from "./workflow-report-render.js";

const STORY_PAGES_SUBDIR = "workflow-report-stories";
const QUESTIONS_FILE = "workflow-report-questions.html";

// Pull the bullets out of a markdown body's "## Open questions" section. Stops
// at the next h2 heading. Tolerates Q&A-style answers in the same bullet — we
// just record the full bullet text. Returns the raw inline text per bullet.
function extractOpenQuestions(body: string): string[] {
  const lines = body.split("\n");
  const items: string[] = [];
  let inSection = false;
  let buf: string[] = [];
  const flush = (): void => {
    const text = buf.join(" ").trim();
    if (text) items.push(text);
    buf = [];
  };
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (/^##\s+Open questions\b/i.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    // Any new h2 heading ends the section.
    if (/^##\s+/.test(line)) {
      flush();
      break;
    }
    const bulletMatch = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      flush();
      buf.push(bulletMatch[1]);
    } else if (buf.length > 0 && line.trim() !== "") {
      // Continuation of a multi-line bullet.
      buf.push(line.trim());
    } else if (line.trim() === "") {
      // Blank line — bullet ends but section may continue.
      flush();
    }
  }
  flush();
  return items;
}

export interface GenerateWorkflowReportInput {
  readonly projectDir: string;
}

export interface GenerateWorkflowReportResult {
  readonly path: string;
  readonly totals: {
    readonly prds: number;
    readonly epics: number;
    readonly stories: number;
  };
}

const VALID_STATUSES: ReadonlySet<StoryStatus> = new Set([
  "draft",
  "ready",
  "in_progress",
  "done",
  "blocked",
]);

interface Frontmatter {
  readonly raw: Record<string, string>;
  readonly ok: boolean;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Tiny YAML-frontmatter reader. Handles `key: value` lines plus an inline list
// like `testing: [unit, integration]`. Anything else is dropped — this repo
// has no `js-yaml` dep and the spec frontmatter never nests.
function parseFrontmatter(body: string): Frontmatter {
  if (!body.startsWith("---\n") && !body.startsWith("---\r\n")) {
    return { raw: {}, ok: false };
  }
  const afterFirst = body.indexOf("\n", 3) + 1;
  const closeIdx = body.indexOf("\n---", afterFirst);
  if (closeIdx === -1) return { raw: {}, ok: false };
  const block = body.slice(afterFirst, closeIdx);
  const out: Record<string, string> = {};
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = stripQuotes(line.slice(colon + 1));
    if (!key) continue;
    out[key] = value;
  }
  return { raw: out, ok: Object.keys(out).length > 0 };
}

function extractTitle(body: string, fallbackId: string): string {
  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const m = line.match(/^#\s+(.+)$/);
    if (m) {
      const heading = m[1].trim();
      // Strip the `US-NNN — ` (em-dash) or `US-NNN - ` (hyphen) prefix.
      const stripped = heading.replace(
        /^(US|EPIC|PRD)-\d+\s*[—–-]\s*/u,
        "",
      );
      return stripped || heading;
    }
  }
  return fallbackId;
}

function isStoryStatus(value: string): value is StoryStatus {
  return VALID_STATUSES.has(value as StoryStatus);
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw new Error(
      `safeReaddir(${JSON.stringify(dir)}) failed: ${(err as Error).message}`,
    );
  }
}

async function readStoryFile(
  filePath: string,
  projectDir: string,
  prdId: string,
  epicId: string,
): Promise<{ card: StoryCard; rawBody: string }> {
  let body: string;
  try {
    body = await readFile(filePath, "utf8");
  } catch (err) {
    throw new Error(
      `readStoryFile(${JSON.stringify(filePath)}) failed: ${(err as Error).message}`,
    );
  }
  const fm = parseFrontmatter(body);
  const fallbackId = basename(filePath, ".md");
  const id = fm.raw.id?.trim() || fallbackId;
  const title = extractTitle(body, id);
  const priority = fm.raw.priority?.trim() ?? "";
  const rawStatus = fm.raw.status?.trim() ?? "";
  const status: StoryStatus = isStoryStatus(rawStatus) ? rawStatus : "unparsed";

  // The card's href points at the rendered story page (a sibling under .claude/),
  // not at the raw .md. The source path is preserved separately so the story page
  // can link back to it. Story-page filename is `<prd>__<epic>__<story>.html` to
  // sidestep slug collisions and keep the layout flat in one folder.
  const sourceRelPath = relative(resolve(projectDir, ".claude"), resolve(filePath));
  const storyPageName = `${prdId}__${epicId}__${basename(filePath, ".md")}.html`;
  const relPath = `./${STORY_PAGES_SUBDIR}/${storyPageName}`;
  const rawBody = stripFrontmatter(body);
  const bodyHtml = renderMarkdown(rawBody);

  return {
    card: {
      id,
      title,
      priority,
      status,
      relPath,
      sourceRelPath,
      prdId,
      epicId,
      bodyHtml,
    },
    rawBody,
  };
}

// Drop the leading YAML frontmatter block from a story body so the rendered
// preview shows the human-readable content only (not the `id: …` repeats).
function stripFrontmatter(body: string): string {
  if (!body.startsWith("---\n") && !body.startsWith("---\r\n")) return body;
  const afterFirst = body.indexOf("\n", 3) + 1;
  const closeIdx = body.indexOf("\n---", afterFirst);
  if (closeIdx === -1) return body;
  // Skip past the closing fence and the line break that follows it.
  const tailStart = body.indexOf("\n", closeIdx + 4);
  return tailStart === -1 ? "" : body.slice(tailStart + 1);
}

interface WalkResult {
  prds: PrdSummary[];
  stories: StoryCard[];
  openQuestions: OpenQuestion[];
  epicCount: number;
}

// Source-href helper for open questions. Questions live on the questions page at
// `.claude/workflow-report-questions.html`; sources live elsewhere under .claude/
// (or in docs/requirements/ for the .md). We want one consistent base — the
// questions page — for all hrefs.
function questionHrefFor(claudeDir: string, target: string): string {
  // `target` is already an abs path. relative() will produce a forward-slash path
  // because we're staying within .claude/ siblings.
  return relative(claudeDir, target).split("/").join("/");
}

async function walkSpecTree(projectDir: string): Promise<WalkResult> {
  const requirementsDir = join(projectDir, "docs", "requirements");
  const prdDirs = (await safeReaddir(requirementsDir))
    .filter((name) => name.startsWith("PRD-"))
    .sort();

  const prds: PrdSummary[] = [];
  const stories: StoryCard[] = [];
  const openQuestions: OpenQuestion[] = [];
  let epicCount = 0;
  const claudeDir = resolve(projectDir, ".claude");

  for (const prdDirName of prdDirs) {
    const prdDir = join(requirementsDir, prdDirName);
    const childNames = await safeReaddir(prdDir);
    const epicDirNames = childNames.filter((n) => n.startsWith("EPIC-")).sort();

    // PRD title — first `# ` heading in PRD-*.md inside the prdDir, if present.
    const prdFileName = childNames.find(
      (n) => n.startsWith("PRD-") && n.endsWith(".md"),
    );
    let prdTitle = prdDirName;
    let prdId = prdDirName;
    if (prdFileName) {
      const prdPath = join(prdDir, prdFileName);
      const prdBody = await readFile(prdPath, "utf8").catch(() => "");
      const fm = parseFrontmatter(prdBody);
      if (fm.raw.id) prdId = fm.raw.id.trim();
      prdTitle = extractTitle(prdBody, prdDirName);
      for (const text of extractOpenQuestions(prdBody)) {
        openQuestions.push({
          source: { kind: "prd", id: prdId, prdId },
          text,
          sourceHref: questionHrefFor(claudeDir, prdPath),
        });
      }
    }

    prds.push({ id: prdId, title: prdTitle, epicCount: epicDirNames.length });
    epicCount += epicDirNames.length;

    for (const epicDirName of epicDirNames) {
      const epicDir = join(prdDir, epicDirName);
      const epicChildren = await safeReaddir(epicDir);
      const epicFile = epicChildren.find(
        (n) => n.startsWith("EPIC-") && n.endsWith(".md"),
      );
      const epicId = epicDirName;
      if (epicFile) {
        const epicPath = join(epicDir, epicFile);
        const epicBody = await readFile(epicPath, "utf8").catch(() => "");
        for (const text of extractOpenQuestions(epicBody)) {
          openQuestions.push({
            source: { kind: "epic", id: epicId, prdId, epicId },
            text,
            sourceHref: questionHrefFor(claudeDir, epicPath),
          });
        }
      }
      const storyFiles = epicChildren
        .filter((n) => n.startsWith("US-") && n.endsWith(".md"))
        .sort();
      for (const storyFile of storyFiles) {
        const storyPath = join(epicDir, storyFile);
        const { card, rawBody } = await readStoryFile(storyPath, projectDir, prdId, epicId);
        stories.push(card);
        // Use the rendered story page as the source link, not the raw .md —
        // questions are surfaced in context so the reader lands on the
        // human-friendly view, with the raw md still reachable from there.
        const storyHref = card.relPath.replace(/^\.\//, "");
        for (const text of extractOpenQuestions(rawBody)) {
          openQuestions.push({
            source: { kind: "story", id: card.id, prdId, epicId },
            text,
            sourceHref: storyHref,
          });
        }
      }
    }
  }

  return { prds, stories, openQuestions, epicCount };
}

export async function generateWorkflowReport(
  input: GenerateWorkflowReportInput,
): Promise<GenerateWorkflowReportResult> {
  // Same allowlist shape as mineMemory / measureTeam — projectDir must resolve
  // under the user's home, tmpdir, or ~/.claude/projects. Prevents path-traversal
  // tricks like "../../etc". Tests use a tmpdir fixture so tmpdir() is on the list.
  const projectDir = assertPathUnderAllowedRoots(
    input.projectDir,
    [claudeProjectsRoot(), homedir(), tmpdir()],
    "generateWorkflowReport.projectDir",
  );

  const walk = await walkSpecTree(projectDir);

  const model: WorkflowReportModel = {
    projectName: basename(projectDir),
    generatedAt: new Date().toISOString(),
    prds: walk.prds,
    stories: walk.stories,
    openQuestions: walk.openQuestions,
    totals: {
      prds: walk.prds.length,
      epics: walk.epicCount,
      stories: walk.stories.length,
      openQuestions: walk.openQuestions.length,
    },
  };

  const html = renderWorkflowHtml(model);
  const outDir = join(projectDir, ".claude");
  const outPath = join(outDir, "workflow-report.html");
  const storyPagesDir = join(outDir, STORY_PAGES_SUBDIR);
  const questionsPath = join(outDir, QUESTIONS_FILE);

  try {
    await mkdir(outDir, { recursive: true });
    await mkdir(storyPagesDir, { recursive: true });
    await writeFile(outPath, html, "utf8");
    // Questions page — sibling of the main report.
    await writeFile(questionsPath, renderQuestionsPage(model, "./workflow-report.html"), "utf8");
    for (const card of walk.stories) {
      const pageHref = card.relPath; // already `./workflow-report-stories/<file>.html`
      const pagePath = join(outDir, pageHref.replace(/^\.\//, ""));
      const sourceFromPage = relative(dirname(pagePath), join(outDir, card.sourceRelPath));
      const backFromPage = relative(dirname(pagePath), outPath);
      const pageHtml = renderStoryPage(card, backFromPage, sourceFromPage);
      await writeFile(pagePath, pageHtml, "utf8");
    }
  } catch (err) {
    throw new Error(
      `generateWorkflowReport.write(${JSON.stringify(outPath)}) failed: ${(err as Error).message}`,
    );
  }

  return { path: outPath, totals: model.totals };
}
