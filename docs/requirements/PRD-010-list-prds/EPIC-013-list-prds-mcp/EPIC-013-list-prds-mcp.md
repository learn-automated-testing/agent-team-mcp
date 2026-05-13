# EPIC-013 — `list_prds` MCP tool

> **Status:** draft (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-010-list-prds.md

## Problem statement

The MCP has no `list_prds` counterpart to `list_rules`. External callers parse `docs/requirements/` by hand. This epic adds a single new core function and its MCP tool wrapper.

## Goal

A user can call `list_prds({projectDir})` from any MCP-aware client and receive a sorted, structured array of every PRD in the project's `docs/requirements/` folder, with status and epic count.

## Scope (v1)

**In scope**
- New `src/core/prds.ts` with `listPrds({projectDir})` reading `docs/requirements/PRD-*/PRD-*.md`.
- New `src/tools/listPrds.ts` registering the MCP tool.
- Frontmatter parser for the `> **Status:**` line; tolerates missing/malformed.
- Allowlist on `projectDir` matching the convention in `mineMemory` (no path traversal).

**Out of scope**
- Listing epics or stories (separate epics if those tools turn out to be needed).
- Any write or mutation.
- Caching — read every call.

## Users

- **AI developer / LLM** — calls the tool from inside Claude Code, Cursor, or any MCP client.
- **Audit-report consumer (EPIC-011)** — switches its PRD source from a hand-rolled glob to this tool.

## User stories

### Must-have
- [US-001 — `list_prds` returns a sorted summary array](./US-001-list-prds-tool.md)

## Milestones

| # | Focus | Stories |
|---|---|---|
| MH-1 | Tool ships | US-001 |

## Testing scope

Unit + integration in `src/core/prds.test.ts`. Set up a tmpdir with a few PRD folders and assert: empty case, sorted output, malformed-PRD tolerance, allowlist rejection of off-tree `projectDir`.

## Decisions (recorded 2026-05-10)

1. Mirror `list_rules` shape — `{ total, prds: [...] }` — for caller familiarity.
2. Status comes from the PRD body (`> **Status:** ...`), not frontmatter, because that's where the existing PRDs put it.

## Open questions

1. Whether to include `lastModified` (file mtime) — defer to v2 unless a caller needs it.

## Success metrics

- Round-trips on this repo's 10 PRDs in < 50ms.
- Drop-in replacement for the audit-report's hand-rolled PRD glob within one PR.

---

**Relation with other epics:**
- [EPIC-011 — Audit HTML dashboard](../../PRD-008-rule-hygiene/EPIC-011-audit-html-dashboard/EPIC-011-audit-html-dashboard.md) — likely consumer of this tool.
