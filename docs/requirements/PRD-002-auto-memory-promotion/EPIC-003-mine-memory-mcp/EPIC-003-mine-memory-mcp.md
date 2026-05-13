# EPIC-003 — `mine_memory` + `promote_memory` MCP tools

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-002-auto-memory-promotion.md

## Problem statement

Claude Code writes auto-memory to `~/.claude/projects/<encodedProjectPath>/memory/` — useful but personal. Team-shared rules / lessons live under `.claude/`. Without a bridge, personal learnings never become team conventions unless the user manually re-types them through `add_rule` / `capture_lesson`.

## Goal

A developer can mine the auto-memory directory for promotion candidates that are not already represented in `.claude/rules/`, `.claude/.skillsrepo.json`, or `.claude/context.md`, and can promote one explicit candidate at a time into a real rule or lesson.

## Scope (v1)

**In scope**
- `mineMemory({projectDir, memoryDir?})` reads `MEMORY.md` + sibling `*.md` topic files, parses bullet items, dedupes against captured artifacts, returns enriched candidates with `target` / `paths` / `category` suggestions.
- `promoteMemory({projectDir, target, …})` delegates to `addRule` or `captureLesson`.
- MCP tools `mine_memory` and `promote_memory`.
- `memoryDir` override for testing and non-default locations.

**Out of scope**
- Bulk auto-promote.
- Edits to auto-memory.
- Cross-project mining.
- Semantic dedup.

## Users

- **AI developer** — at session-end wants to snapshot auto-memory into shared rules.
- **Team lead** — auditing patterns emerging across dogfooding sessions.

## User stories

### Must-have
- [US-001 — `mine_memory` returns deduped candidates with metadata](./US-001-mine-memory-tool.md)
- [US-002 — `promote_memory` converts one candidate into a rule or lesson](./US-002-promote-memory-tool.md)

### Should-have
- [US-003 — `memoryDir` override on `mine_memory`](./US-003-memory-dir-override.md)

## Testing scope

Unit + integration in `src/core/memory-mine.test.ts` — uses fixture memory directories, asserts dedup against existing rules / lessons, asserts target/paths inference.

## Decisions (recorded 2026-05-10)

1. Promotion always reuses `addRule` / `captureLesson` so validation is inherited.
2. Read-only on auto-memory; never write back.
3. Default memory dir uses `absProjectPath.replace(/\//g, "-")` encoding.

## Open questions

1. Anthropic may change the on-disk encoding of `<encodedProjectPath>` — would break mining silently.

## Success metrics

- `mine_memory` returns ≥ 1 candidate after a week of dogfooding.
- ≥ 50% of surfaced candidates get promoted.

---

**Relation with other epics:**
- [EPIC-002 — `add_rule`](../EPIC-002-add-rule-mcp/EPIC-002-add-rule-mcp.md) — `promote_memory` delegates here for rule promotion.
- [EPIC-009 — `capture_lesson`](../EPIC-009-capture-lesson-mcp/EPIC-009-capture-lesson-mcp.md) — `promote_memory` delegates here for lesson promotion.
