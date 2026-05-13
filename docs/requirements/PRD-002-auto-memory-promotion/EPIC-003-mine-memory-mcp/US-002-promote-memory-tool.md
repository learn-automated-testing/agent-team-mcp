---
id: US-002
epic: EPIC-003-mine-memory-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-002 — `promote_memory` converts one candidate into a rule or lesson

As an **AI developer**, I want **to call `promote_memory({projectDir, target, …})` and have one explicit candidate become a real rule or lesson**, so that **promotion always goes through the same validated path as `add_rule` / `capture_lesson`**.

## Context

After `mine_memory` surfaces candidates, the user picks one and hands it to `promote_memory`. The tool delegates to `addRule` or `captureLesson` based on `target`, inheriting their validation (kebab-case names, non-empty reason, dedup).

**Existing implementation:** `src/core/promote.ts`; MCP wrapper `promote_memory`.

## Acceptance criteria

- [x] Calling `promote_memory({target: "rule", name, title, rules, paths?, reason?})` writes a properly-formatted `.claude/rules/<name>.md` (delegates to `addRule`).
- [x] Calling `promote_memory({target: "lesson", category, lesson, reason})` appends to `## Learned conventions` and `.skillsrepo.json` (delegates to `captureLesson`).
- [x] Validation errors from the delegated tool surface unchanged.
- [x] No bulk mode — one entry per call.

## Testing

- **Unit (vitest)**: `src/core/memory-mine.test.ts` (and adjacent) cover both delegation paths.
- **Integration (vitest)**: fixture round-trip from `mine_memory` candidate to `promote_memory` write.

## Notes / implementation hints

Reusing `addRule` / `captureLesson` keeps validation in one place — never invent a second write path.
