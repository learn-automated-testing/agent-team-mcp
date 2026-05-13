---
id: US-003
epic: EPIC-009-capture-lesson-mcp
priority: must-have
status: done
testing: [unit]
---

# US-003 — Empty / whitespace-only `reason` is rejected

As an **AI developer**, I want **`capture_lesson` to refuse calls with an empty or whitespace-only `reason`**, so that **the captured lessons always include the why, not just the what**.

## Context

The whole point of the lessons system is to compound institutional knowledge. A bullet without a reason is noise; the validation enforces this at the tool boundary.

**Existing implementation:** validation in `captureLesson`.

## Acceptance criteria

- [x] Calling `capture_lesson` with `reason: ""` returns a validation error.
- [x] Calling with `reason: "   "` (whitespace only) returns the same error.
- [x] No file is written when validation fails.
- [x] Error message names the `reason` field.

## Testing

- **Unit (vitest)**: validation unit test covers empty / whitespace cases.

## Notes / implementation hints

The validation also propagates through `promote_memory({target: "lesson"})` — see EPIC-003 US-002.
