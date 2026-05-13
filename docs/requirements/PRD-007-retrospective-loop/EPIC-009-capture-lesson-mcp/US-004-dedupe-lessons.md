---
id: US-004
epic: EPIC-009-capture-lesson-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-004 — Same lesson text is deduped (case-insensitive, trimmed)

As an **AI developer capturing a lesson I may already have captured**, I want **`capture_lesson` to detect the duplicate and respond informationally without writing twice**, so that **`context.md` and `.skillsrepo.json` stay clean across reruns**.

## Context

Dedup keys on the `lesson` text after trim + lowercase, against both `## Learned conventions` bullets in `context.md` and `lessons[]` in `.skillsrepo.json`.

**Existing implementation:** dedup in `captureLesson`.

## Acceptance criteria

- [x] Calling `capture_lesson` with text that already exists (modulo case / trim) returns an informational response indicating "already captured".
- [x] No new bullet is appended to `## Learned conventions`.
- [x] No new entry is appended to `lessons[]`.
- [x] Different text (even differing by punctuation) is treated as a new lesson.

## Testing

- **Unit (vitest)**: dedup unit test covers exact, case-different, whitespace-different inputs.
- **Integration (vitest)**: MCP smoke verifies repeated calls do not duplicate.

## Notes / implementation hints

Dedup is also the reason `mine_memory` does not re-surface already-captured items.
