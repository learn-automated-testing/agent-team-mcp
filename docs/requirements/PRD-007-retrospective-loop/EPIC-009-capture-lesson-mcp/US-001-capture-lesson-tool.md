---
id: US-001
epic: EPIC-009-capture-lesson-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `capture_lesson` appends to `context.md` and `.skillsrepo.json`

As an **AI developer**, I want **`capture_lesson({projectDir, category, lesson, reason})` to append a markdown bullet under `## Learned conventions` in `.claude/context.md` and a structured entry in `.claude/.skillsrepo.json`**, so that **every agent sees my captured lesson on the next turn**.

## Context

The tool is the entry point for the retrospective loop. Both writes are append-only — never restructure user content. The section is created in `context.md` if absent.

**Existing implementation:** `captureLesson` in `src/core/lessons.ts` (or adjacent); MCP wrapper `capture_lesson`.

## Acceptance criteria

- [x] After `capture_lesson({category: "code", lesson: "X", reason: "Y"})`, `.claude/context.md` contains `## Learned conventions` with a bullet `- [code] X — Y` (or equivalent stable format).
- [x] After the call, `.claude/.skillsrepo.json` contains a `lessons[]` entry `{ category, lesson, reason, capturedAt }`.
- [x] When `## Learned conventions` does not exist in `context.md`, the section is created.
- [x] User-edited content elsewhere in `context.md` is not touched.
- [x] `category` outside `"code" | "process" | "tooling" | "domain"` is rejected.

## Testing

- **Unit (vitest)**: file-writer test for the section-creation behaviour.
- **Integration (vitest)**: MCP tool smoke round-trips through `capture_lesson` and `list_lessons`.

## Notes / implementation hints

The append marker uses a stable string so dedup can find it across reruns.
