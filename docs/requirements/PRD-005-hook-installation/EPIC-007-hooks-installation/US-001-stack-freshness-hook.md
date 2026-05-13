---
id: US-001
epic: EPIC-007-hooks-installation
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — Stack-freshness hook fires on dependency-file edits

As an **AI developer**, I want **a hook that fires when I touch `package.json`, `pyproject.toml`, `go.mod`, or `Cargo.toml`**, so that **I am warned about installed skills whose "Detected stack" section is now stale**.

## Context

`PostToolUse` hook on `Edit`/`Write` matching the four dependency files runs a bundled node script that prints stale-skill warnings. Hook entries are merged into `.claude/settings.json` without disturbing pre-existing entries.

**Existing implementation:** `src/core/install-hooks.ts` `mergeHooks`; bundled hook script under `.claude/hooks/`.

## Acceptance criteria

- [x] After `install_setup`, `.claude/settings.json` contains a `PostToolUse` hook matching `Edit`/`Write` on the four dependency files.
- [x] The hook entry points at the bundled freshness script.
- [x] Re-running install does not duplicate the entry.
- [x] If the hook script errors, the user's edit is not blocked (fail open).

## Testing

- **Unit (vitest)**: `mergeHooks` test asserts merge preserves pre-existing entries and is idempotent.
- **Integration (vitest)**: install fixture asserts settings.json includes the hook entry.

## Notes / implementation hints

The script only warns; it does not auto-fire `refine_item` (open question — currently warn-only).
