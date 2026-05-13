---
id: US-001
epic: EPIC-013-list-prds-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `list_prds` returns a sorted summary array

As an **AI developer / LLM client**, I want to **call `list_prds({projectDir})` and receive every PRD in the project as a structured array**, so that **I can answer "what features have we spec'd?" without globbing the filesystem and parsing markdown by hand**.

## Context

`list_rules` already exists at `src/core/rules.ts` + `src/tools/listRules.ts`. This story adds the symmetric tool for PRDs. PRDs live at `docs/requirements/PRD-NNN-<slug>/PRD-NNN-<slug>.md`. Status is read from the body line `> **Status:** <state>` (existing PRDs all use that format).

**Existing implementation:** none — new files `src/core/prds.ts` and `src/tools/listPrds.ts`.
**Builds on:** the migrated spec hierarchy under `docs/requirements/` (PRDs 001–009 already in place).

## Acceptance criteria

- [x] Calling `listPrds({ projectDir })` on a project with `docs/requirements/PRD-*` folders returns `{ total, prds }` where `prds` is sorted by id ascending.
- [x] Each entry contains `{ id, slug, title, status, path, epicCount }` — `id` like `"PRD-010"`, `slug` like `"list-prds"`, `path` is the absolute path to the PRD `.md` file, `epicCount` is the count of `EPIC-*` subfolders in the PRD folder.
- [x] Calling on a project with no `docs/requirements/` directory returns `{ total: 0, prds: [] }` — no error.
- [x] A PRD file missing the `> **Status:** ...` line yields `status: "unknown"` for that entry but does not break the listing of the other PRDs.
- [x] `projectDir` is rejected (thrown) when it's outside the allowlist applied by `mineMemory` and `measureTeam` — no path traversal.
- [x] The MCP tool `list_prds` registers and returns the same `{ total, prds }` payload over the wire.

## Testing

> Replace `<unit-framework>` etc. with this project's actual frameworks: `vitest`.

- **Unit (`vitest`)**: in `src/core/prds.test.ts` — tmpdir fixtures cover (a) empty `docs/requirements/`, (b) two valid PRDs returned in sorted order, (c) one malformed PRD yielding `status: "unknown"`, (d) `epicCount` = number of `EPIC-*` siblings.
- **Integration (`vitest`)**: same file — calling through the MCP tool wrapper returns the same payload as the core function.

## Notes / implementation hints

- Mirror the shape of `listRules` so callers can reason by analogy.
- Read the `> **Status:**` line with a regex anchored to start-of-line, since the PRD bodies wrap it in a blockquote.
- For `epicCount`: a single `readdir` of the PRD folder, filter by name prefix `EPIC-`.

## Open questions

- Sort by `id` (numeric portion) vs lexicographic over the full string? — answered: sort by full `id` string lexicographically, since zero-padded NNN makes them numeric-equivalent.
