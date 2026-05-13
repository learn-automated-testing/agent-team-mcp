# PRD-002 — Auto-memory promotion

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/auto-memory-promotion.md` (migrated to this hierarchy — see git history)

## Problem statement

Claude Code's auto-memory watches for corrections and writes them to `~/.claude/projects/<project>/memory/` automatically — but those learnings are machine-local and personal. Team-shared artifacts (rules, lessons) are version-controlled under `.claude/`. There is no bridge between the two, so personal learnings never become team conventions unless a user manually re-types `capture_lesson` or `add_rule`.

## Goal

A developer can mine Claude's auto-memory for promotion candidates, dedupe against already-captured team artifacts, and promote a chosen candidate into a rule or lesson with a single tool call — always user-approved, never auto-written.

## Users

- **AI developers at session-end** — want to snapshot what Claude learned into shared rules.
- **Team leads** — want to audit patterns that emerge across dogfooding sessions.

## Capabilities (high level)

- `mine_memory` MCP tool that surfaces auto-memory candidates not already present in `.claude/rules/`, `.claude/.skillsrepo.json` lessons, or the Learned conventions section of `.claude/context.md`.
- Each candidate carries a suggested `target` (rule | lesson), `name`/category, and (for rules) inferred `paths:` glob.
- `promote_memory` MCP tool that converts one explicit candidate into a real rule or lesson by delegating to `add_rule` / `capture_lesson`.
- Read-only on auto-memory; promotion is one entry at a time, no bulk auto-promote.
- `memoryDir` override for testing and non-default memory locations.

## Non-functional requirements

- **Safety:** read-only on auto-memory — never edits or deletes from there.
- **Validation:** promotion reuses `add_rule` / `capture_lesson` so non-empty reason, kebab-case names, and dedup are inherited.
- **Resilience:** works gracefully when the auto-memory directory does not exist (returns `total: 0`).

## Out of scope

- Auto-promotion without user approval.
- Cross-project mining (one project at a time).
- Semantic dedup (string normalization only).
- Editing auto-memory to mark entries as promoted.
- Hook-triggered periodic mining.

## Open questions

- Exact encoding of `<encodedProjectPath>` — assumed `/` → `-`; if Anthropic changes this the mining breaks silently.
- Whether to write a pointer back into auto-memory ("promoted to rule X") to prevent re-surfacing — v1 skips.

## Success metrics

- `mine_memory` returns ≥ 1 candidate after a week of real dogfooding.
- ≥ 50% of surfaced candidates get promoted.
- Zero false-promotion incidents in smoke and dogfooding.

---

## Epics

- [EPIC-003 — `mine_memory` + `promote_memory` MCP tools](./EPIC-003-mine-memory-mcp/EPIC-003-mine-memory-mcp.md)
