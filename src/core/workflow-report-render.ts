// Pure HTML renderer for the workflow kanban. Self-contained: inline CSS only,
// no external scripts, no web fonts, no <link> tags. Mirrors the inline-style
// approach in audit-report.ts but produces a kanban view of the spec hierarchy.

export type StoryStatus = "draft" | "ready" | "in_progress" | "done" | "blocked" | "unparsed";

export const STATUS_COLUMNS: readonly StoryStatus[] = [
  "draft",
  "ready",
  "in_progress",
  "done",
  "blocked",
  "unparsed",
] as const;

const EPIC_STATUS_COLUMNS: readonly StoryStatus[] = [
  "draft",
  "ready",
  "in_progress",
  "done",
  "blocked",
] as const;

function prettifySlug(id: string, prefixRe: RegExp): string {
  const slug = id.replace(prefixRe, "");
  if (!slug) return id;
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function epicTitleFromId(epicId: string): string {
  return prettifySlug(epicId, /^EPIC-\d+-/);
}

export interface StoryCard {
  readonly id: string;
  readonly title: string;
  readonly priority: string;
  readonly status: StoryStatus;
  /** Relative href used by the kanban card — points to the rendered story page. */
  readonly relPath: string;
  /** Relative href used by the rendered story page — points back at the source .md. */
  readonly sourceRelPath: string;
  readonly prdId: string;
  readonly epicId: string;
  readonly bodyHtml: string;
}

export interface PrdSummary {
  readonly id: string;
  readonly title: string;
  readonly epicCount: number;
}

export interface OpenQuestion {
  readonly source: {
    readonly kind: "prd" | "epic" | "story";
    readonly id: string;
    readonly prdId: string;
    readonly epicId?: string;
  };
  readonly text: string;
  /** Relative href from .claude/workflow-report-questions.html to the source. */
  readonly sourceHref: string;
}

export interface WorkflowReportModel {
  readonly projectName: string;
  readonly generatedAt: string;
  readonly prds: readonly PrdSummary[];
  readonly stories: readonly StoryCard[];
  readonly openQuestions: readonly OpenQuestion[];
  readonly totals: {
    readonly prds: number;
    readonly epics: number;
    readonly stories: number;
    readonly openQuestions: number;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function statusLabel(status: StoryStatus): string {
  if (status === "in_progress") return "In progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderCard(card: StoryCard): string {
  const href = escapeAttr(card.relPath);
  return `
        <a class="card" href="${href}">
          <header class="card-head">
            <span class="card-id"><code>${escapeHtml(card.id)}</code></span>
            <span class="card-priority tag tag-${escapeAttr(card.priority || "unset")}">${escapeHtml(card.priority || "unset")}</span>
          </header>
          <p class="card-title">${escapeHtml(card.title)}</p>
          <p class="card-meta muted">${escapeHtml(card.prdId)} / ${escapeHtml(card.epicId)}</p>
        </a>`;
}

function renderColumn(status: StoryStatus, cards: readonly StoryCard[]): string {
  const inner = cards.length === 0
    ? `<p class="muted empty">no stories</p>`
    : cards.map(renderCard).join("\n");
  return `
      <section class="column column-${status}">
        <header class="column-head">
          <h3>${escapeHtml(statusLabel(status))}</h3>
          <span class="count">${cards.length}</span>
        </header>
        <div class="column-body">
          ${inner}
        </div>
      </section>`;
}

const STYLE = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 1.5em; color: #1f2937; line-height: 1.5; background: #f9fafb; }
h1 { margin: 0 0 0.2em 0; border-bottom: 2px solid #1f2937; padding-bottom: 0.3em; }
h2 { color: #1e40af; margin: 2em 0 0.6em 0; }
h3 { margin: 0; font-size: 1em; color: #374151; }
header.page { margin-bottom: 1em; }
header.page .meta { color: #6b7280; font-size: 0.9em; }
.muted { color: #6b7280; font-size: 0.9em; }
code { background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; }
.totals { display: flex; flex-wrap: wrap; gap: 0.5em; margin: 0.5em 0 1.2em 0; }
.totals .stat { background: #eef2ff; color: #1e3a8a; padding: 0.4em 0.8em; border-radius: 6px; font-size: 0.9em; }
.totals .stat b { font-weight: 700; }
.totals .questions-link { background: #fef3c7; color: #92400e; padding: 0.4em 0.8em; border-radius: 6px; font-size: 0.9em; text-decoration: none; }
.totals .questions-link:hover { background: #fde68a; }
.kanban { display: grid; grid-template-columns: repeat(5, minmax(180px, 1fr)); gap: 0.6em; overflow-x: auto; margin-top: 0.5em; }
.kanban-unparsed { display: grid; grid-template-columns: repeat(1, minmax(220px, 600px)); gap: 0.8em; }
.prd-section { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.8em 1em 1em 1em; margin: 1em 0; }
.prd-section > h3 { margin: 0 0 0.2em 0; font-size: 1.1em; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
.prd-section .prd-meta { font-size: 0.85em; color: #6b7280; margin: 0.1em 0 0.6em 0; }
details.epic { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin: 0.6em 0; padding: 0.4em 0.7em; }
details.epic[open] { background: #ffffff; }
details.epic > summary { cursor: pointer; font-weight: 600; color: #374151; padding: 0.3em 0; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 0.6em; flex-wrap: wrap; }
details.epic > summary::-webkit-details-marker { display: none; }
details.epic > summary::before { content: "▶"; display: inline-block; transition: transform 0.15s; font-size: 0.7em; color: #6b7280; }
details.epic[open] > summary::before { transform: rotate(90deg); }
details.epic > summary .epic-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; color: #6b7280; }
details.epic > summary .epic-counts { font-size: 0.8em; color: #6b7280; font-weight: 400; }
details.epic > summary .epic-counts .pip { display: inline-block; padding: 0.05em 0.5em; border-radius: 999px; margin-left: 0.3em; font-size: 0.78em; }
details.epic > summary .epic-counts .pip-done { background: #dbeafe; color: #1e40af; }
details.epic > summary .epic-counts .pip-ready { background: #ecfdf5; color: #059669; }
details.epic > summary .epic-counts .pip-in_progress { background: #fef3c7; color: #92400e; }
details.epic > summary .epic-counts .pip-blocked { background: #fee2e2; color: #991b1b; }
details.epic > summary .epic-counts .pip-draft { background: #f3f4f6; color: #6b7280; }
.column { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; display: flex; flex-direction: column; min-height: 200px; }
.column-head { display: flex; justify-content: space-between; align-items: center; padding: 0.6em 0.8em; border-bottom: 1px solid #e5e7eb; background: #f9fafb; border-radius: 8px 8px 0 0; }
.column-head .count { background: #e5e7eb; color: #374151; padding: 0.1em 0.6em; border-radius: 999px; font-size: 0.8em; font-weight: 600; }
.column-draft .column-head { background: #f3f4f6; }
.column-ready .column-head { background: #ecfdf5; }
.column-in_progress .column-head { background: #fef3c7; }
.column-done .column-head { background: #dbeafe; }
.column-blocked .column-head { background: #fee2e2; }
.column-unparsed .column-head { background: #fde68a; }
.column-body { padding: 0.6em; display: flex; flex-direction: column; gap: 0.6em; }
.empty { margin: 0.4em 0.2em; font-style: italic; }
.card { display: block; background: #ffffff; border: 1px solid #e5e7eb; border-left: 4px solid #6366f1; border-radius: 6px; padding: 0.6em 0.7em; box-shadow: 0 1px 2px rgba(0,0,0,0.04); text-decoration: none; color: inherit; transition: box-shadow 0.12s, transform 0.12s; }
.card:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.08); transform: translateY(-1px); }
.column-done .card { border-left-color: #2563eb; }
.column-blocked .card { border-left-color: #dc2626; }
.column-in_progress .card { border-left-color: #d97706; }
.column-ready .card { border-left-color: #059669; }
.column-draft .card { border-left-color: #6b7280; }
.column-unparsed .card { border-left-color: #b45309; }
.card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5em; }
.card-id a, .card-id { text-decoration: none; }
.card-id a:hover { text-decoration: underline; }
.card-title { margin: 0.3em 0; font-size: 0.95em; }
.card-meta { margin: 0; font-size: 0.78em; }
.tag { display: inline-block; padding: 0.05em 0.45em; border-radius: 3px; font-size: 0.72em; font-weight: 600; background: #e5e7eb; color: #374151; }
.tag-must-have { background: #fee2e2; color: #991b1b; }
.tag-should-have { background: #fef3c7; color: #92400e; }
.tag-could-have { background: #dbeafe; color: #1e40af; }
.tag-wont-have { background: #f3f4f6; color: #6b7280; }
.tag-unset { background: #f3f4f6; color: #6b7280; }
footer { margin-top: 2em; padding-top: 1em; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.85em; }
`;

function groupStories(stories: readonly StoryCard[]): {
  byPrdEpic: Map<string, Map<string, StoryCard[]>>;
  unparsed: StoryCard[];
} {
  const byPrdEpic = new Map<string, Map<string, StoryCard[]>>();
  const unparsed: StoryCard[] = [];
  for (const story of stories) {
    if (story.status === "unparsed" || !story.prdId || !story.epicId) {
      unparsed.push(story);
      continue;
    }
    let epics = byPrdEpic.get(story.prdId);
    if (!epics) {
      epics = new Map<string, StoryCard[]>();
      byPrdEpic.set(story.prdId, epics);
    }
    const list = epics.get(story.epicId) ?? [];
    list.push(story);
    epics.set(story.epicId, list);
  }
  return { byPrdEpic, unparsed };
}

function renderEpicSummary(epicId: string, cards: readonly StoryCard[]): string {
  const counts: Partial<Record<StoryStatus, number>> = {};
  for (const card of cards) {
    counts[card.status] = (counts[card.status] ?? 0) + 1;
  }
  const pips = (["done", "ready", "in_progress", "blocked", "draft"] as const)
    .filter((s) => (counts[s] ?? 0) > 0)
    .map((s) => `<span class="pip pip-${s}">${escapeHtml(statusLabel(s))} ${counts[s]}</span>`)
    .join("");
  return `<summary><span><span class="epic-id">${escapeHtml(epicId)}</span> — ${escapeHtml(epicTitleFromId(epicId))}</span><span class="epic-counts">${cards.length} ${cards.length === 1 ? "story" : "stories"}${pips}</span></summary>`;
}

function renderEpic(epicId: string, cards: readonly StoryCard[]): string {
  const byStatus = new Map<StoryStatus, StoryCard[]>();
  for (const status of EPIC_STATUS_COLUMNS) byStatus.set(status, []);
  for (const card of cards) {
    const list = byStatus.get(card.status as StoryStatus);
    if (list) list.push(card);
  }
  const columns = EPIC_STATUS_COLUMNS.map((s) =>
    renderColumn(s, byStatus.get(s) ?? []),
  ).join("\n");
  return `
    <details class="epic" open>
      ${renderEpicSummary(epicId, cards)}
      <div class="kanban">
${columns}
      </div>
    </details>`;
}

function renderPrdSection(prd: PrdSummary, epicMap: Map<string, StoryCard[]> | undefined): string {
  const epicIds = epicMap ? Array.from(epicMap.keys()).sort() : [];
  const inner = epicIds.length === 0
    ? `<p class="muted empty">No stories yet for this PRD.</p>`
    : epicIds.map((eid) => renderEpic(eid, epicMap!.get(eid) ?? [])).join("\n");
  return `
  <section class="prd-section">
    <h3><code>${escapeHtml(prd.id)}</code> — ${escapeHtml(prd.title)}</h3>
    ${inner}
  </section>`;
}

function renderUnparsedSection(unparsed: readonly StoryCard[]): string {
  if (unparsed.length === 0) return "";
  const cards = unparsed.map(renderCard).join("\n");
  return `
  <section class="prd-section">
    <h3>Unparsed (${unparsed.length})</h3>
    <p class="prd-meta">Stories whose frontmatter could not be parsed or whose epic/PRD context is missing.</p>
    <div class="kanban-unparsed">
      <section class="column column-unparsed">
        <header class="column-head"><h3>Unparsed</h3><span class="count">${unparsed.length}</span></header>
        <div class="column-body">${cards}</div>
      </section>
    </div>
  </section>`;
}

export function renderWorkflowHtml(model: WorkflowReportModel): string {
  const { byPrdEpic, unparsed } = groupStories(model.stories);

  const prdSections = model.prds
    .map((prd) => renderPrdSection(prd, byPrdEpic.get(prd.id)))
    .join("\n");

  const questionsBadge = model.totals.openQuestions > 0
    ? ` <a class="questions-link" href="./workflow-report-questions.html">Open questions: <b>${model.totals.openQuestions}</b> →</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Workflow report — ${escapeHtml(model.projectName)}</title>
<style>${STYLE}</style>
</head>
<body>
<header class="page">
<h1>Workflow report — ${escapeHtml(model.projectName)}</h1>
<p class="meta">Generated ${escapeHtml(model.generatedAt)}</p>
</header>

<div class="totals">
  <span class="stat">PRDs: <b>${model.totals.prds}</b></span>
  <span class="stat">Epics: <b>${model.totals.epics}</b></span>
  <span class="stat">Stories: <b>${model.totals.stories}</b></span>${questionsBadge}
</div>

${prdSections}
${renderUnparsedSection(unparsed)}

<footer>
Generated by agent-team-mcp. Regenerate with <code>generate_workflow_report</code>.
</footer>
</body>
</html>`;
}

const STORY_PAGE_STYLE = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; color: #1f2937; line-height: 1.65; background: #f9fafb; }
.wrap { max-width: 760px; margin: 0 auto; padding: 1.4em 1.6em 3em 1.6em; }
.back { display: inline-block; margin-bottom: 1em; color: #1e40af; text-decoration: none; font-size: 0.9em; }
.back:hover { text-decoration: underline; }
header.page { background: #ffffff; padding: 1.4em 1.6em; border-bottom: 1px solid #e5e7eb; }
header.page h1 { margin: 0 0 0.3em 0; font-size: 1.6em; }
header.page .crumbs { color: #6b7280; font-size: 0.88em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.meta-table { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.8em 1em; margin: 1.2em 0; font-size: 0.92em; }
.meta-table dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.4em 1em; margin: 0; }
.meta-table dt { font-weight: 600; color: #374151; }
.meta-table dd { margin: 0; color: #1f2937; }
.body { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.4em 1.8em; font-size: 1em; }
.body h1 { font-size: 1.5em; margin: 0 0 0.6em 0; padding-bottom: 0.3em; border-bottom: 1px solid #e5e7eb; }
.body h2 { font-size: 1.25em; margin: 1.4em 0 0.5em 0; color: #1e40af; }
.body h3 { font-size: 1.1em; margin: 1.2em 0 0.4em 0; color: #1e3a8a; }
.body h4, .body h5, .body h6 { font-size: 1em; margin: 1em 0 0.3em 0; color: #374151; }
.body p { margin: 0.7em 0; }
.body ul, .body ol { margin: 0.5em 0; padding-left: 1.6em; }
.body li { margin: 0.3em 0; }
.body li.cb { list-style: none; margin-left: -1.4em; }
.body li.cb input[type="checkbox"] { margin-right: 0.4em; transform: scale(1.1); vertical-align: middle; }
.body blockquote { margin: 0.8em 0; padding: 0.5em 1em; border-left: 4px solid #c7d2fe; color: #4b5563; background: #f5f7ff; border-radius: 0 4px 4px 0; }
.body pre { background: #1f2937; color: #f9fafb; padding: 0.9em 1.1em; border-radius: 6px; overflow-x: auto; font-size: 0.9em; line-height: 1.5; }
.body pre code { background: transparent; color: inherit; padding: 0; }
.body code { background: #f3f4f6; padding: 0.12em 0.4em; border-radius: 3px; font-size: 0.92em; }
.body a { color: #1e40af; }
.tag { display: inline-block; padding: 0.1em 0.55em; border-radius: 4px; font-size: 0.85em; font-weight: 600; }
.tag-status-done { background: #dbeafe; color: #1e40af; }
.tag-status-ready { background: #ecfdf5; color: #065f46; }
.tag-status-in_progress { background: #fef3c7; color: #92400e; }
.tag-status-blocked { background: #fee2e2; color: #991b1b; }
.tag-status-draft { background: #f3f4f6; color: #6b7280; }
.tag-status-unparsed { background: #fde68a; color: #78350f; }
footer { text-align: center; color: #6b7280; font-size: 0.85em; padding: 1em; }
`;

const QUESTIONS_PAGE_STYLE = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; color: #1f2937; line-height: 1.55; background: #f9fafb; }
.wrap { max-width: 920px; margin: 0 auto; padding: 1.4em 1.6em 3em 1.6em; }
.back { display: inline-block; margin-bottom: 1em; color: #1e40af; text-decoration: none; font-size: 0.9em; }
.back:hover { text-decoration: underline; }
header.page { background: #ffffff; padding: 1.2em 1.6em; border-bottom: 1px solid #e5e7eb; }
header.page h1 { margin: 0 0 0.2em 0; font-size: 1.5em; }
header.page .count { color: #6b7280; font-size: 0.92em; }
.empty { background: #ffffff; padding: 1.2em; border-radius: 8px; border: 1px solid #e5e7eb; color: #6b7280; }
.q-group { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1em 1.2em; margin: 1em 0; }
.q-group > h2 { margin: 0 0 0.4em 0; font-size: 1.1em; color: #1e40af; }
.q-group .meta { font-size: 0.85em; color: #6b7280; margin: 0 0 0.6em 0; }
.q-list { list-style: none; padding: 0; margin: 0; }
.q-list li { padding: 0.6em 0.8em; border-top: 1px solid #f3f4f6; display: grid; grid-template-columns: 7em 1fr; gap: 0.8em; align-items: start; }
.q-list li:first-child { border-top: 0; }
.q-tag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.78em; padding: 0.15em 0.5em; border-radius: 4px; text-align: center; align-self: center; }
.q-tag-prd { background: #dbeafe; color: #1e40af; }
.q-tag-epic { background: #ede9fe; color: #5b21b6; }
.q-tag-story { background: #ecfdf5; color: #065f46; }
.q-text { margin: 0; }
.q-text a { color: #1e40af; }
.q-text a:hover { text-decoration: underline; }
.q-source { display: block; font-size: 0.8em; color: #6b7280; margin-top: 0.2em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
footer { text-align: center; color: #6b7280; font-size: 0.85em; padding: 1em; }
`;

function escapeQuestionInline(text: string): string {
  // Allow `inline code` and **bold** in question bullets, since open questions
  // sometimes reference filenames or emphasis. Stripped HTML otherwise.
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
  return out;
}

export function renderQuestionsPage(model: WorkflowReportModel, backHref: string): string {
  const total = model.openQuestions.length;
  if (total === 0) {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Open questions — ${escapeHtml(model.projectName)}</title><style>${QUESTIONS_PAGE_STYLE}</style></head>
<body><header class="page"><div class="wrap" style="padding-bottom:0;"><a class="back" href="${escapeAttr(backHref)}">← Back to workflow report</a><h1>Open questions</h1><p class="count">No open questions found in any PRD, epic, or story.</p></div></header><div class="wrap"><p class="empty">All open questions have been resolved or none have been recorded yet.</p></div></body></html>`;
  }

  // Group by PRD, then list questions in source order: PRD first, epics next, stories last.
  const byPrd = new Map<string, OpenQuestion[]>();
  for (const q of model.openQuestions) {
    const list = byPrd.get(q.source.prdId) ?? [];
    list.push(q);
    byPrd.set(q.source.prdId, list);
  }
  const groups: string[] = [];
  for (const prd of model.prds) {
    const list = byPrd.get(prd.id);
    if (!list || list.length === 0) continue;
    const items = list
      .map((q) => {
        const tagKind = q.source.kind;
        const sourceLabel = q.source.kind === "prd"
          ? q.source.id
          : q.source.kind === "epic"
            ? `${q.source.epicId ?? ""}`
            : `${q.source.epicId ?? ""} / ${q.source.id}`;
        return `<li>
          <span class="q-tag q-tag-${tagKind}">${escapeHtml(tagKind.toUpperCase())}</span>
          <p class="q-text"><a href="${escapeAttr(q.sourceHref)}">${escapeQuestionInline(q.text)}</a><span class="q-source">${escapeHtml(sourceLabel)}</span></p>
        </li>`;
      })
      .join("");
    groups.push(`
    <section class="q-group">
      <h2><code>${escapeHtml(prd.id)}</code> — ${escapeHtml(prd.title)}</h2>
      <p class="meta">${list.length} ${list.length === 1 ? "question" : "questions"}</p>
      <ul class="q-list">${items}</ul>
    </section>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Open questions — ${escapeHtml(model.projectName)}</title>
<style>${QUESTIONS_PAGE_STYLE}</style>
</head>
<body>
<header class="page">
  <div class="wrap" style="padding-bottom: 0;">
    <a class="back" href="${escapeAttr(backHref)}">← Back to workflow report</a>
    <h1>Open questions</h1>
    <p class="count">${total} across ${byPrd.size} ${byPrd.size === 1 ? "PRD" : "PRDs"}</p>
  </div>
</header>
<div class="wrap">
${groups.join("\n")}
</div>
<footer>Generated by agent-team-mcp · regenerate with <code>generate_workflow_report</code></footer>
</body>
</html>`;
}

export function renderStoryPage(card: StoryCard, backHref: string, sourceHref: string): string {
  const safeStatus = escapeAttr(card.status);
  const safePriority = escapeAttr(card.priority || "unset");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(card.id)} — ${escapeHtml(card.title)}</title>
<style>${STORY_PAGE_STYLE}</style>
</head>
<body>
<header class="page">
  <div class="wrap" style="padding-bottom: 0;">
    <a class="back" href="${escapeAttr(backHref)}">← Back to workflow report</a>
    <p class="crumbs">${escapeHtml(card.prdId)} / ${escapeHtml(card.epicId)}</p>
    <h1>${escapeHtml(card.id)} — ${escapeHtml(card.title)}</h1>
  </div>
</header>
<div class="wrap">
  <div class="meta-table">
    <dl>
      <dt>Status</dt><dd><span class="tag tag-status-${safeStatus}">${escapeHtml(card.status)}</span></dd>
      <dt>Priority</dt><dd><span class="tag tag-${safePriority}">${escapeHtml(card.priority || "unset")}</span></dd>
      <dt>Epic</dt><dd><code>${escapeHtml(card.epicId)}</code></dd>
      <dt>PRD</dt><dd><code>${escapeHtml(card.prdId)}</code></dd>
      <dt>Source</dt><dd><a href="${escapeAttr(sourceHref)}"><code>${escapeHtml(sourceHref)}</code></a></dd>
    </dl>
  </div>
  <article class="body">
${card.bodyHtml || "<p>No content available.</p>"}
  </article>
</div>
<footer>Generated by agent-team-mcp · regenerate with <code>generate_workflow_report</code></footer>
</body>
</html>`;
}
