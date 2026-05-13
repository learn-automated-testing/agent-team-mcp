# EPIC-002 — `add_rule` + `list_rules` MCP tools

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-001-align-with-claude-canon.md

## Problem statement

`.claude/rules/` is the canonical home for path-scoped coding standards (Anthropic convention), but skillsrepo had no MCP-callable way to author rules in the proper format. Users had to hand-write the YAML frontmatter and bullet structure, which is error-prone and discourages adoption.

## Goal

A developer (or driving LLM) can call a single MCP tool to write a properly-formatted rule file under `.claude/rules/`, optionally scoped via `paths:` frontmatter, and can call another tool to enumerate every installed rule (optionally filtered by path).

## Scope (v1)

**In scope**
- `addRule({projectDir, name, paths?, title, rules, reason?, goodExample?, badExample?, overwrite?})` core function.
- `listRules({projectDir, pathFilter?})` core function.
- MCP tool wrappers `add_rule` and `list_rules`.
- Idempotent rule writes — re-run errors unless `overwrite: true`.

**Out of scope**
- Editing rules in place (deletion / editing future work).
- Rule promotion from auto-memory (covered by EPIC-003).

## Users

- **AI developer** — wants to capture a coding standard once, have it auto-loaded by Claude.
- **Driving LLM** — needs a structured tool to translate user intent ("never use `any` in TypeScript") into a properly-scoped rule file.

## User stories

### Must-have
- [US-001 — `add_rule` writes a properly-formatted rule file](./US-001-add-rule-tool.md)
- [US-002 — `list_rules` enumerates installed rules with optional path filter](./US-002-list-rules-tool.md)

## Testing scope

Unit + integration in `src/core/rules.test.ts` — covers frontmatter rendering, idempotency / overwrite, and `pathFilter` matching.

## Decisions (recorded 2026-05-10)

1. Frontmatter omitted entirely when no `paths` given (rule applies unconditionally).
2. Examples sections omitted when `goodExample` / `badExample` not provided.
3. Rule-file writes are idempotent — same name errors unless `overwrite: true`.

## Open questions

None at v1 release.

## Success metrics

- Users author ≥ 2 rules via `add_rule` in the first week of adoption.
- Zero rule files written with invalid frontmatter in dogfooding.

---

**Relation with other epics:**
- [EPIC-001 — Claude canon layout](../EPIC-001-claude-canon-layout/EPIC-001-claude-canon-layout.md) — provides the `.claude/rules/` directory that `add_rule` writes into.
- [EPIC-003 — `mine_memory`](../EPIC-003-mine-memory-mcp/EPIC-003-mine-memory-mcp.md) — `promote_memory` delegates to `addRule` for rule promotion.
- [EPIC-010 — Rule audit and ops](../EPIC-010-rule-audit-and-ops/EPIC-010-rule-audit-and-ops.md) — operates on the rules authored here.
