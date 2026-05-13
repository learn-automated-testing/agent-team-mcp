# EPIC-010 — Rule audit and ops

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-008-rule-hygiene.md

## Problem statement

`.claude/rules/` accumulates over time. Unscoped rules all load at session start, duplicates pile up, and rules whose `paths:` no longer match anything in the repo become noise. There was no tool to surface this clutter or act on it.

## Goal

A developer can audit the rules directory for duplicates / staleness / oversize / unscoped count, can merge multiple rule files into one (unioning paths and deleting sources), and can archive a rule out of Claude Code's auto-load path.

## Scope (v1)

**In scope**
- `auditRules({projectDir})` returning `{ total, scoped, unscoped, duplicates, stale, oversize, health }` with `health ∈ "good" | "warning" | "cluttered"`.
- Duplicate detection via normalised-bullet overlap (trim + lowercase + collapse-whitespace).
- Stale detection by glob-walking each rule's `paths:` against the project tree.
- `mergeRules({projectDir, into, from, paths?, title?})` concatenating bullets, unioning `paths:`, deleting sources.
- `archiveRule({projectDir, name})` moving `<name>.md` to `archive/<name>.md`.

**Out of scope**
- Automatic merging of duplicates (surfaced by audit, merged on explicit call).
- Multi-project audit.
- HTML dashboard (covered by EPIC-011).

## Users

- **AI developer with weeks of accumulated rules** — wants to spot duplicates / stale entries.
- **Team lead** — wants a periodic hygiene check.

## User stories

### Must-have
- [US-001 — `audit_rules` reports duplicates, stale, oversize, health](./US-001-audit-rules-tool.md)
- [US-002 — `merge_rules` concatenates and unions paths, deletes sources](./US-002-merge-rules-tool.md)
- [US-003 — `archive_rule` moves a rule out of the auto-load path](./US-003-archive-rule-tool.md)

## Testing scope

Unit + integration in `src/core/audit.test.ts` — fixture rule directories assert duplicate / stale detection, merge concatenation behaviour, and archive move.

## Decisions (recorded 2026-05-10)

1. Health thresholds: `good` requires unscoped ≤ 5, total ≤ 20, no file > 80 lines, no duplicates. Tunable after dogfooding.
2. Archive moves rather than deletes — recoverable.
3. `.claude/rules/archive/` is not on Claude Code's auto-load path.

## Open questions

1. Final tuning of "good / warning / cluttered" thresholds after wider dogfooding.

## Success metrics

- A user with ≥ 10 rules sees ≥ 1 actionable item from `audit_rules` after a week of dogfooding.

---

**Relation with other epics:**
- [EPIC-002 — `add_rule`](../EPIC-002-add-rule-mcp/EPIC-002-add-rule-mcp.md) — operates on rules authored through `add_rule`.
- [EPIC-011 — Audit HTML dashboard](../EPIC-011-audit-html-dashboard/EPIC-011-audit-html-dashboard.md) — renders the audit results visually.
