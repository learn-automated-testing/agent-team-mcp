# PRD-007 — Retrospective loop → learned conventions

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/retrospective-loop.md` (migrated to this hierarchy — see git history)

## Problem statement

Templates start generic and stay generic. Hard-won project-specific lessons ("we always use `Result` types because last quarter a thrown exception took prod down") never make it back into the team's guidance. Each post-mortem is one-off, and across projects the same lessons get relearned. Vibe coding compounds quality only when the system captures what it is learning; today skillsrepo does not.

## Goal

A developer can capture a lesson mid-development and have it folded into `.claude/context.md` automatically, visible to every agent on the next turn, with the data model in place for future cross-project promotion.

## Users

- **AI developers** — noticing recurring corrections or "never do that again" moments.
- **Teams** — wanting institutional knowledge to compound, not evaporate.

## Capabilities (high level)

- `capture_lesson` MCP tool that appends to `## Learned conventions` in `.claude/context.md` (creating the section if absent).
- Captured lesson is also appended to a structured `lessons: []` array in `.claude/.skillsrepo.json` with `category`, `lesson`, `reason`, `capturedAt`.
- `capture_lesson` rejects calls with empty / whitespace-only `reason` — the point is the why.
- Same-text dedup against both locations (case-insensitive, trimmed) returns informational response without writing.
- `list_lessons` MCP tool returns the structured lessons array.

## Non-functional requirements

- **User-edit safety:** writing to `context.md` appends only — never restructures.
- **Persistence:** metadata persisted across MCP reconnects via `.skillsrepo.json`.

## Out of scope

- Automatic promotion of a lesson to a template (future work).
- ML / LLM categorisation of lessons — user picks the category.
- Cross-project shared conventions directory (placeholder reserved at `~/.skillsrepo/shared-conventions.md`).
- Per-agent attachment of lessons — all lessons are project-wide for v1.

## Open questions

- Should the `## Learned conventions` section ship in the default `context.md`, or be created lazily?
- Sensible cap on lesson count per project before context.md bloat becomes a problem?

## Success metrics

- Users capture ≥ 3 lessons per project in the first two weeks.
- Recurring user corrections drop ≥ 50% compared to pre-feature baseline.

---

## Epics

- [EPIC-009 — `capture_lesson` + `list_lessons` MCP tools](./EPIC-009-capture-lesson-mcp/EPIC-009-capture-lesson-mcp.md)
