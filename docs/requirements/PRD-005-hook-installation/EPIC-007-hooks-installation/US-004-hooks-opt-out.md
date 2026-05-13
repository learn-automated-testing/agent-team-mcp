---
id: US-004
epic: EPIC-007-hooks-installation
priority: should-have
status: done
testing: [integration]
---

# US-004 — `install_setup({hooks: false})` opts out cleanly

As an **AI developer on a team that manages hooks centrally**, I want **`install_setup({hooks: false})` to skip hook installation entirely**, so that **skillsrepo does not interfere with my central settings.json or pre-commit pipeline**.

## Context

`install_setup` accepts `hooks?: boolean` defaulting to `true`. When `false`, no hook entries are merged into `.claude/settings.json` and no pre-commit hook is installed.

**Existing implementation:** `installSetup` `hooks` parameter in `src/core/install.ts`.

## Acceptance criteria

- [x] When `install_setup({hooks: false})` runs, no entries are added to `.claude/settings.json`.
- [x] `.husky/pre-commit` and `.git/hooks/pre-commit` are not modified.
- [x] The install report explicitly indicates hooks were skipped.
- [x] Default behaviour (no `hooks` flag) installs all three hooks.

## Testing

- **Integration (vitest)**: install fixture asserts no hook entries when `hooks: false`.

## Notes / implementation hints

The opt-out is a single boolean; per-hook opt-out is not in scope for v1.
