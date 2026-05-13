---
id: US-001
epic: EPIC-010-rule-audit-and-ops
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `audit_rules` reports duplicates, stale, oversize, health

As an **AI developer with weeks of accumulated rules**, I want **to call `audit_rules({projectDir})` and get totals, scoped/unscoped split, duplicates, stale, oversize, and a health rating**, so that **I can see at a glance what needs cleaning up**.

## Context

`auditRules` walks `.claude/rules/`, normalises bullets for duplicate detection (trim + lowercase + collapse whitespace), glob-walks each rule's `paths:` for staleness, and applies threshold-based health rating.

**Existing implementation:** `src/core/audit.ts`; MCP wrapper `audit_rules`.

## Acceptance criteria

- [x] Returns `{ total, scoped, unscoped, duplicates, stale, oversize, health }`.
- [x] Duplicate bullets appearing in ≥ 2 files are flagged in `duplicates`.
- [x] Rules whose `paths:` glob matches zero files in the project are flagged in `stale`.
- [x] Files over 80 lines appear in `oversize`.
- [x] Health is `"good"` when unscoped ≤ 5, total ≤ 20, no file > 80 lines, no duplicates; otherwise `"warning"` or `"cluttered"`.
- [x] Tool is read-only — no rule files are modified.

## Testing

- **Unit (vitest)**: `src/core/audit.test.ts` covers each detection case and threshold boundary.
- **Integration (vitest)**: MCP tool wrapper round-trip on a fixture rule directory.

## Notes / implementation hints

Files under `.claude/rules/archive/` are excluded from all counts.
