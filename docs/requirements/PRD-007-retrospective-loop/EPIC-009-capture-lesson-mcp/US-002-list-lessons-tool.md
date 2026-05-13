---
id: US-002
epic: EPIC-009-capture-lesson-mcp
priority: should-have
status: done
testing: [integration]
---

# US-002 — `list_lessons` returns the structured lessons array

As an **AI developer**, I want **to call `list_lessons({projectDir})` and review every lesson captured so far**, so that **I have a programmatic view of project learning history**.

## Context

Reads the `lessons[]` array from `.claude/.skillsrepo.json` and returns it verbatim.

**Existing implementation:** `listLessons` core function; MCP wrapper `list_lessons`.

## Acceptance criteria

- [x] Returns the full `lessons[]` array from `.claude/.skillsrepo.json`.
- [x] Each entry has `category`, `lesson`, `reason`, `capturedAt`.
- [x] Returns `[]` when no lessons have been captured.
- [x] Returns `[]` (not an error) when `.claude/.skillsrepo.json` is missing.

## Testing

- **Integration (vitest)**: round-trip test through `capture_lesson` then `list_lessons`.

## Notes / implementation hints

`capturedAt` is ISO-8601 UTC.
