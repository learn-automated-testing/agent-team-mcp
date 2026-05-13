# PRD-011 — Visual workflow report

> **Status:** draft (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source material:** internal — surfaced 2026-05-10 while validating the new PRD → Epic → Story hierarchy.

## Problem statement

`docs/requirements/` now contains 10 PRDs, 13 epics, 38 stories — and the only way to see "where is story US-NNN in the workflow?" is to open files individually and read the `status:` frontmatter. There is no aggregate view of (a) which stories are ready for the developer, (b) which are stuck in draft, (c) which are done. The MCP already produces a single-file HTML audit dashboard via `generate_audit_report`; the same shape is missing for the spec hierarchy.

## Goal

A user (or LLM) can produce a single-file HTML report — `.claude/workflow-report.html` — that renders every story in the project as a kanban-style board grouped by PRD → Epic → status, so spec progress is visible at a glance without reading individual files.

## Users

- **AI developer / product owner** — wants a daily glance at "what's ready, what's in progress, what's blocked".
- **LLM driving the project** — wants a single artefact to reason about workflow state without reparsing 50+ files.

## Capabilities (high level)

- Users can call `generate_workflow_report({projectDir})` and a single-file `.claude/workflow-report.html` is written.
- The report shows one swimlane per PRD, sub-grouped by epic, with stories rendered as cards in five status columns: draft / ready / in_progress / done / blocked.
- Each card shows story id, title, priority, and a click-through (relative `<a>`) to its source markdown file.
- Re-running the tool overwrites the report — idempotent.
- Self-contained HTML (no CDN, no external scripts), parallel to `generate_audit_report`.

## Non-functional requirements

- **Performance:** completes in < 1 s for a project with 100 stories.
- **Security:** read-only on the spec tree; rejects `projectDir` outside the existing allowlist.
- **Resilience:** stories with malformed/missing frontmatter render in a "Could not parse" group rather than crashing the report.
- **Output:** single self-contained HTML — no `<script src=…>`, no external font, no CDN. Inline CSS only.

## Out of scope

- A live-updating dashboard (one-shot render only — re-run to refresh).
- Editing stories from the report (read-only).
- Cross-project aggregation (one project per report).
- Mermaid / Gantt-style timeline (future PRD if needed).
- Integration with `.claude/state.json` workflow step (future story; v1 reads only the per-story frontmatter).

## Open questions

- Should the report sort PRDs by id ascending (PRD-001 first) or by activity (most recent first)? — v1 = id ascending.
- Should it include the `audit-report.html` summary inline, or stay focused on stories? — v1 = focused.

## Success metrics

- Calling `generate_workflow_report({projectDir: "."})` on this repo produces an HTML file that renders every existing PRD/epic/story in under one second, opens cleanly in Chrome / Safari / Firefox, and contains zero `src="http"` / `href="https://cdn`.
- Time-to-answer for "which stories are ready for the developer?" drops from "open 38 files" to one screen.

---

## Epics

- [EPIC-014 — `generate_workflow_report` MCP tool](./EPIC-014-workflow-report-html/EPIC-014-workflow-report-html.md)
