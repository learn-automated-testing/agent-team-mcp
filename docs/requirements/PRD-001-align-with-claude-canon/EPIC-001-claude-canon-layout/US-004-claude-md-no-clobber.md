---
id: US-004
epic: EPIC-001-claude-canon-layout
priority: should-have
status: done
testing: [integration]
---

# US-004 — Existing `CLAUDE.md` is never clobbered

As an **AI developer**, I want **my hand-written `CLAUDE.md` to survive an `install_setup` rerun**, so that **the installer never destroys content I personally wrote**.

## Context

`CLAUDE.md` is Claude Code's auto-loaded root instruction file. Users frequently hand-edit it. The installer must skip writing when one exists unless `overwrite: true` is explicit.

**Existing implementation:** `writeIfAllowed` guard in `src/core/install.ts`.

## Acceptance criteria

- [x] When `outDir/CLAUDE.md` already exists and `overwrite=false`, the file is not modified.
- [x] The install report lists `CLAUDE.md` under `report.skipped` with a reason mentioning the `overwrite=true` opt-in.
- [x] When `overwrite=true`, the file is rewritten from the template.
- [x] `report.warnings` carries an entry when the skipped file would have been written by the current plan (stale-file warning).

## Testing

- **Integration (vitest)**: `install-target.test.ts` and adjacent install tests cover skip-with-existing-file and overwrite paths.

## Notes / implementation hints

The same no-clobber semantics apply to rule files and skill subdirectory contents — see EPIC-002 / EPIC-001 US-003.
