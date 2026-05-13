---
id: US-003
epic: EPIC-007-hooks-installation
priority: must-have
status: done
testing: [integration]
---

# US-003 — Commit-gate hook blocks commit on `needs-fixes` / `blocked`

As an **AI developer**, I want **a pre-commit hook that blocks `git commit` when `state.json` has `status: "needs-fixes"` or `"blocked"`**, so that **I cannot land work that the workflow says is not ready**.

## Context

The hook installs under `.husky/pre-commit` if husky is detected, otherwise `.git/hooks/pre-commit`. It reads `.claude/state.json`, exits non-zero on `needs-fixes` / `blocked`, and prints which step is owed.

**Existing implementation:** commit-gate writer in `src/core/install-hooks.ts`.

## Acceptance criteria

- [x] After `install_setup` on a project without husky, `.git/hooks/pre-commit` is installed (or amended) with the gate script.
- [x] After `install_setup` on a project with husky, `.husky/pre-commit` is installed (or amended) instead.
- [x] When `state.json` says `status: "needs-fixes"` (or `"blocked"`), the commit fails with a message naming the owed step.
- [x] When `state.json` is in any other state, the commit proceeds normally.
- [x] Re-running install does not duplicate the gate.

## Testing

- **Integration (vitest)**: install fixture + simulated `git commit` invocation asserts block / pass behaviour.

## Notes / implementation hints

Hook fails open on script errors: if reading `state.json` throws, the commit proceeds rather than locking the user out.
