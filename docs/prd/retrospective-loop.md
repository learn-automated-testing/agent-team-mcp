# PRD: retrospective loop → learned conventions

## Problem statement
Templates start generic and stay generic. Hard-won project-specific lessons
("we always use `Result` types because last quarter a thrown exception took prod down")
never make it back into the team's guidance. Each post-mortem is one-off, and across
projects the same lessons get relearned. Vibe coding compounds quality only when the
system captures what it's learning; today skillsrepo does not.

## Goal
Provide a lightweight mechanism to capture a lesson mid-development, fold it into
`.claude/context.md` automatically, and make it visible to every agent on the next turn.
Foundation for (optional) cross-project promotion of recurring lessons.

## Users
- AI developers in the middle of a project noticing a recurring correction or a "never do that again" moment
- Teams wanting institutional knowledge to compound rather than evaporate

## User stories
- **must-have** As an AI developer, I can call `capture_lesson({projectDir, category, lesson, reason})` and have it appended to `.claude/context.md` under a `## Learned conventions` section (creating that section if absent).
- **must-have** As an AI developer, every agent sees my captured lessons on the next turn, because they all read `.claude/context.md` by convention.
- **must-have** As an AI developer, calling `capture_lesson` without a `reason` is rejected — the point is the why, not the what.
- **should-have** As an AI developer, I can call `list_lessons({projectDir})` to review everything captured so far.
- **should-have** When I capture the same lesson on a third project, skillsrepo suggests promoting it to a shared convention (future scope, but reserve the data model).

## Functional requirements
1. New MCP tool `capture_lesson({projectDir, category, lesson, reason})` where `category` ∈ `"code" | "process" | "tooling" | "domain"`.
2. Appends a markdown list item to `## Learned conventions` in `.claude/context.md`, creating the section if absent.
3. Also appends a structured entry to `.claude/.skillsrepo.json` under a `lessons: []` array: `{category, lesson, reason, capturedAt}`.
4. Reject the call if `reason` is empty or whitespace-only.
5. Dedupe: if the same lesson text (case-insensitive, trimmed) already exists in either location, return an informational response without writing a duplicate.
6. New MCP tool `list_lessons({projectDir})` returns the structured lessons array.

## Non-functional requirements
- Writing to `context.md` must preserve user edits — append only, never restructure.
- Metadata persisted across MCP reconnects via `.skillsrepo.json`.

## Out of scope
- Automatic promotion of a lesson to a template (explicitly listed as should-have for a future PRD)
- ML / LLM categorisation of lessons — user picks the category
- Cross-project shared conventions directory (future; reserve a placeholder at `~/.skillsrepo/shared-conventions.md`)
- Per-agent attachment of lessons — all lessons are project-wide for v1

## Open questions
- Should the "## Learned conventions" section be part of the shipped context.md template from the start, or created lazily on first capture?
- Is there a sensible limit on lesson count per project before the context.md bloat becomes a problem?

## Success metrics
- Users capture ≥ 3 lessons per project in the first two weeks of adoption.
- Recurring user corrections (same correction repeated by the user within one project) drop by ≥ 50% compared to pre-feature baseline.
