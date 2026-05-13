---
id: US-002
epic: EPIC-007-hooks-installation
priority: must-have
status: done
testing: [unit]
---

# US-002 — State-validator `Stop` hook warns on inconsistency

As an **AI developer**, I want **a `Stop` hook that reads `.claude/state.json` and warns if status is inconsistent with the turn's activity**, so that **drift between declared workflow position and actual work is surfaced before the next turn**.

## Context

When `current_step: "test"` but no test activity occurred in the turn, the hook prints a warning. Fail-open: the warning is informational and does not block the user.

**Existing implementation:** bundled state-validator script under `.claude/hooks/`; entry merged into `.claude/settings.json`.

## Acceptance criteria

- [x] After `install_setup`, `.claude/settings.json` contains a `Stop` hook entry pointing at the validator script.
- [x] The hook reads `.claude/state.json` and prints a warning string when `current_step` does not match the turn's activity.
- [x] When the script errors, the turn completes normally (fail open).

## Testing

- **Unit (vitest)**: validator script unit-tested against fixture state files and turn-activity inputs.

## Notes / implementation hints

The script ships under `.claude/hooks/` and is user-readable / editable.
