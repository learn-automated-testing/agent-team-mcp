---
id: US-002
epic: EPIC-005-copilot-rendering-and-warnings
priority: must-have
status: done
testing: [integration]
---

# US-002 — Standalone instructions explicitly point Copilot at `.claude/state.json`

As an **AI developer in copilot-standalone mode**, I want **`.github/copilot-instructions.md` to spell out that workflow state lives at `.claude/state.json` and is updated through ordinary file edits**, so that **Copilot has a clear pointer to the only file that lives outside `.github/` in an otherwise Copilot-flavoured repo**.

## Context

Without this line, a copilot-only user has no other clue why a `.claude/` directory exists in their repo. The standalone template carries the instruction verbatim — not implied.

**Existing implementation:** `templates/copilot-instructions-standalone.md.tmpl`.

## Acceptance criteria

- [x] In a `copilot`-standalone install, `.github/copilot-instructions.md` contains the literal string `.claude/state.json`.
- [x] The instructions explain that Copilot updates this file using its ordinary workspace file-editing tools.
- [x] In `both` mode the bridge variant of the file is used instead, and this requirement does not apply.

## Testing

- **Integration (vitest)**: `src/core/install-target.test.ts` asserts the literal string presence in standalone mode.

## Notes / implementation hints

The instruction must be present in the template literally, not synthesised at runtime.
