# EPIC-009 — `capture_lesson` + `list_lessons` MCP tools

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-007-retrospective-loop.md

## Problem statement

Templates start generic and stay generic. Hard-won lessons evaporated at session end — there was no tool to fold a "never do this again" learning into `.claude/context.md` so the next agent turn would see it.

## Goal

A developer can call `capture_lesson` to append a categorised lesson with mandatory `reason` to `## Learned conventions` in `.claude/context.md` (creating the section if absent) and to a structured `lessons: []` array in `.claude/.skillsrepo.json`, with dedup, and can call `list_lessons` to read everything captured.

## Scope (v1)

**In scope**
- `captureLesson({projectDir, category, lesson, reason})` where `category ∈ "code" | "process" | "tooling" | "domain"`.
- Append-only to `## Learned conventions` in `.claude/context.md`; create section if absent.
- Structured entry in `.claude/.skillsrepo.json` under `lessons: []` with `capturedAt`.
- Reject calls with empty / whitespace-only `reason`.
- Case-insensitive trimmed dedup against either location — informational response, no duplicate write.
- `listLessons({projectDir})` returns the structured array.

**Out of scope**
- Auto-promotion of a lesson to a template.
- ML / LLM categorisation.
- Cross-project shared conventions directory.
- Per-agent lesson attachment.

## Users

- **AI developer mid-project** — wants to snapshot a recurring correction.
- **Team** — wants institutional knowledge that compounds across sessions.

## User stories

### Must-have
- [US-001 — `capture_lesson` appends to context.md and `.skillsrepo.json`](./US-001-capture-lesson-tool.md)
- [US-002 — `list_lessons` returns the structured lessons array](./US-002-list-lessons-tool.md)
- [US-003 — Empty / whitespace-only `reason` is rejected](./US-003-reason-required.md)
- [US-004 — Same lesson text is deduped (case-insensitive, trimmed)](./US-004-dedupe-lessons.md)

## Testing scope

Unit + integration in dedicated capture-lesson tests — assert append-only behaviour on `context.md`, structured persistence, validation, and dedup.

## Decisions (recorded 2026-05-10)

1. Writes to `context.md` are append-only — never restructure user edits.
2. Categories are a fixed enum — user picks, no auto-categorisation.
3. Persistence in `.skillsrepo.json` so metadata survives MCP reconnects.

## Open questions

1. Ship `## Learned conventions` in the default `context.md`, or create lazily on first capture?
2. Sensible cap on lesson count before context.md bloat becomes a problem?

## Success metrics

- Users capture ≥ 3 lessons per project in the first two weeks.
- Recurring corrections drop ≥ 50% vs pre-feature baseline.

---

**Relation with other epics:**
- [EPIC-003 — `mine_memory`](../EPIC-003-mine-memory-mcp/EPIC-003-mine-memory-mcp.md) — `promote_memory` delegates to `captureLesson` for lesson promotion.
