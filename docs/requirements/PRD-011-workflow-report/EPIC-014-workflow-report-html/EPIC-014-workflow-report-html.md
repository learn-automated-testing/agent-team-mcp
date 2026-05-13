# EPIC-014 — `generate_workflow_report` MCP tool

> **Status:** draft (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-011-workflow-report.md

## Problem statement

Every story under `docs/requirements/` carries `status:` frontmatter (`draft | ready | in_progress | done | blocked`), but the only way to see status across the whole project today is reading files one at a time. This epic adds a single core function and MCP tool that walks the spec tree and produces a self-contained HTML kanban.

## Goal

A user can call `generate_workflow_report({projectDir})` and receive a self-contained HTML file at `.claude/workflow-report.html` showing every story in the project, grouped by PRD → Epic → status.

## Scope (v1)

**In scope**
- New `src/core/workflow-report.ts` walking `docs/requirements/PRD-*/EPIC-*/US-*.md`, parsing frontmatter, building an in-memory model.
- New `src/core/workflow-report-render.ts` rendering the model to a self-contained HTML string with inline CSS (parallel to `audit-report.ts`).
- New `src/tools/generateWorkflowReport.ts` registering the MCP tool.
- Idempotent write to `.claude/workflow-report.html` (overwrite).
- Allowlist on `projectDir`, matching `mineMemory` / `measureTeam` convention.
- Five status columns: draft, ready, in_progress, done, blocked. Unknown / malformed frontmatter goes in a sixth "unparsed" lane.

**Out of scope**
- `.claude/state.json` integration (future story).
- Filters or interactive controls in the HTML.
- A markdown-formatted summary alongside the HTML — caller can inspect the file.

## Users

- **AI developer / product owner** — opens the report in a browser to spot stuck stories.
- **LLM client** — reads the rendered HTML or, more usefully, the underlying core function's structured return for reasoning about workflow state.

## User stories

### Must-have
- [US-001 — `generate_workflow_report` writes a self-contained HTML kanban](./US-001-generate-workflow-report-tool.md)

## Milestones

| # | Focus | Stories |
|---|---|---|
| MH-1 | Tool ships | US-001 |

## Testing scope

Unit + integration in `src/core/workflow-report.test.ts`. Set up a tmpdir with two PRDs, three epics, and a mix of story statuses. Assert (a) the tool writes `.claude/workflow-report.html`, (b) the HTML contains every story id, (c) stories appear under their declared status column, (d) the file is self-contained — no `src="http"` or `href="https://cdn"`, (e) re-running overwrites without growth, (f) malformed frontmatter goes to "unparsed" rather than throwing.

## Decisions (recorded 2026-05-10)

1. Mirror `generate_audit_report`'s shape and style — single-file HTML, inline CSS, no CDN — so callers and tests can reason by analogy.
2. Status columns are exactly the five frontmatter values plus "unparsed". No custom statuses in v1.
3. Cards show id, title, priority. Click-through is a relative `<a href>` to the story's `.md` path so it works on any disk layout.

## Open questions

1. Should "blocked" stories carry a visible reason (e.g. read from a `blocked_by:` frontmatter field)? — v1: column header only, no reason field. Defer to v2 if useful.

## Success metrics

- Render every story in this repo (38+) in under one second on a warm filesystem.
- Self-contained HTML opens cleanly in Chrome, Safari, Firefox without console errors.

---

**Relation with other epics:**
- [EPIC-011 — Audit HTML dashboard](../../PRD-008-rule-hygiene/EPIC-011-audit-html-dashboard/EPIC-011-audit-html-dashboard.md) — sibling tool; share style conventions and self-contained constraint.
- [EPIC-013 — `list_prds` MCP tool](../../PRD-010-list-prds/EPIC-013-list-prds-mcp/EPIC-013-list-prds-mcp.md) — could share the PRD-folder discovery code, but v1 inlines.
