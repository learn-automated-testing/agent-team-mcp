---
id: US-001
epic: EPIC-014-workflow-report-html
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `generate_workflow_report` writes a self-contained HTML kanban

As an **AI developer / product owner**, I want **`generate_workflow_report({projectDir})` to write a single-file HTML kanban at `.claude/workflow-report.html`**, so that **I can see every story's workflow position at a glance without reading 38 separate files**.

## Context

There is already `generateAuditReport` at `src/core/audit-report.ts` producing a single-file HTML dashboard; this story adds the same shape for the spec hierarchy under `docs/requirements/`. PRDs live at `docs/requirements/PRD-NNN-<slug>/PRD-NNN-<slug>.md`; epics at `docs/requirements/PRD-NNN-<slug>/EPIC-NNN-<slug>/EPIC-NNN-<slug>.md`; stories at `docs/requirements/PRD-NNN-<slug>/EPIC-NNN-<slug>/US-NNN-<slug>.md` with YAML frontmatter (`id`, `epic`, `priority`, `status`, `testing`).

**Existing implementation:** none — new files `src/core/workflow-report.ts`, `src/core/workflow-report-render.ts`, `src/tools/generateWorkflowReport.ts`.
**Builds on:** `src/core/audit-report.ts` (style + self-contained-HTML conventions), `src/core/memory-mine.ts` (allowlist for `projectDir`).

## Acceptance criteria

- [x] Calling `generateWorkflowReport({ projectDir })` writes a file at `<projectDir>/.claude/workflow-report.html`. The function returns `{ path, totals: { prds, epics, stories } }`.
- [x] The HTML body contains every story `id` from `docs/requirements/PRD-*/EPIC-*/US-*.md` exactly once.
- [x] Each story card appears under a column matching its frontmatter `status` — one of `draft`, `ready`, `in_progress`, `done`, `blocked`. A story whose frontmatter is missing / malformed appears under a sixth column titled `unparsed`.
- [x] Story cards display, at minimum, `id`, story title (the first `# ` heading), and `priority`.
- [x] Each story card has a relative `<a href>` to the story's source `.md` path.
- [x] The HTML file is self-contained: zero `src="http`, zero `href="https://cdn`, zero `<link rel="stylesheet" href="http`. All CSS is inline in a `<style>` block.
- [x] Re-running the tool overwrites the file — file size does not grow on identical re-runs.
- [x] `projectDir` is rejected (thrown) when it is outside the allowlist used by `mineMemory` / `measureTeam`.
- [x] An MCP tool `generate_workflow_report` is registered and returns the same `{ path, totals }` payload over the wire.

## Testing

- **Unit (`vitest`)** — `src/core/workflow-report.test.ts`:
  - tmpdir fixture with two PRDs, three epics, six stories spanning four statuses + one malformed
  - assert all six story ids appear in the HTML
  - assert one story lands in the `unparsed` column
  - assert the HTML contains no `src="http` and no CDN-style `href`
  - assert idempotent re-run produces an identical file (compare sha256 across two runs)
- **Integration (`vitest`)** — same file: call through the registered MCP tool wrapper, assert the same payload + file presence on disk.

## Notes / implementation hints

- Reuse the inline-CSS style approach from `audit-report.ts` (read it before writing the new renderer; do not introduce a new CSS framework or external file).
- For frontmatter parsing: there is no `js-yaml` dep in this repo; a small regex parser similar to the one in `memory-mine.ts` is fine for v1 (`---\n(.*?)\n---`, then per-line `key: value`).
- `epicCount` per PRD is just `readdir(prdFolder).filter(name => name.startsWith("EPIC-"))`. No need to parse epic content.
- The "title" of a story is the text after the first `# ` heading. Strip the leading `US-NNN — ` prefix when displaying in the card; show the bare description.
- `.claude/` may not exist when called fresh on a non-installed project. `mkdir -p` the parent before `writeFile`. (Same gap that `audit-report.ts` has; do not propagate that bug — fix it here.)

## Open questions

- Should clicking a card expand it to show the story's ACs? — v1: no, just link to the .md file. Browser-side expansion would need JS, which violates "self-contained / no scripts" lightly. Defer.
