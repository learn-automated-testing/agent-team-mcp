# PRD-010 — `list_prds` MCP tool

> **Status:** draft (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source material:** internal — surfaced while testing the new PRD → Epic → Story hierarchy on 2026-05-10.

## Problem statement

The MCP exposes `list_rules` to enumerate path-scoped rules in `.claude/rules/`, but there is no symmetric way to enumerate the PRDs under `docs/requirements/`. As the spec hierarchy grows (we already have 9 PRDs after the migration from `docs/prd/`), an external caller — Claude Code, Copilot, a future dashboard — has to glob the filesystem and parse markdown frontmatter by hand to know what features have been spec'd. The work is repeated and the parser drifts.

## Goal

A user (human or LLM) can call `list_prds({projectDir})` and get back a structured list of every PRD in `docs/requirements/`, with status, slug, epic count, and the path to each PRD file.

## Users

- **AI developers** asking "what features have we already spec'd?" — without scrolling a folder tree.
- **Future dashboard maintainers** rendering a project's spec coverage at a glance (parallel to `generate_audit_report`).

## Capabilities (high level)

- Users can call `list_prds({projectDir})` and get a sorted array of `{ id, slug, title, status, path, epicCount }`.
- The status field reflects the PRD's frontmatter `Status:` line (draft / in-progress / done / archived).
- Empty `docs/requirements/` returns `{ total: 0, prds: [] }` without erroring.

## Non-functional requirements

- **Performance:** O(n) over the number of PRD folders. Single pass.
- **Security:** read-only; no file writes; rejects `projectDir` outside an allowlist (same convention as `mineMemory` and `measureTeam`).
- **Resilience:** a malformed PRD file (no `Status:` line, missing title) yields `status: "unknown"` rather than an error — one bad PRD does not break the listing.

## Out of scope

- Listing epics or stories — those belong in `list_epics` / `list_stories` (future PRDs if needed).
- Any write or update operation.
- Cross-project listing.
- Rendering the result as HTML or markdown — caller's job.

## Open questions

- Should `epicCount` be the count of EPIC subfolders, or the count of EPICs whose own status is non-archived? v1 = count subfolders.
- Should the result include the PRD's "Originally:" breadcrumb when present? v1 = no, keep the shape minimal.

## Success metrics

- Calling `list_prds({projectDir: "."})` from this repo returns `total: 10` (the 9 migrated PRDs plus this one) within 50ms on a warm filesystem.
- The `audit-report` HTML dashboard (EPIC-011) can adopt this tool as its PRD source within one PR — no second parser needed.

---

## Epics

- [EPIC-013 — `list_prds` MCP tool](./EPIC-013-list-prds-mcp/EPIC-013-list-prds-mcp.md)
