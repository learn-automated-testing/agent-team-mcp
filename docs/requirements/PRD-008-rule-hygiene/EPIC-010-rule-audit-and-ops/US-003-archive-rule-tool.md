---
id: US-003
epic: EPIC-010-rule-audit-and-ops
priority: must-have
status: done
testing: [unit, integration]
---

# US-003 — `archive_rule` moves a rule out of the auto-load path

As an **AI developer**, I want **`archive_rule({projectDir, name})` to move `.claude/rules/<name>.md` to `.claude/rules/archive/<name>.md`**, so that **Claude Code stops auto-loading the rule but I retain the file**.

## Context

Anthropic's auto-load convention scans `.claude/rules/` directly — subdirectories like `archive/` are not scanned. Moving (not deleting) preserves recoverability.

**Existing implementation:** `archiveRule` in `src/core/rule-ops.ts`; MCP wrapper `archive_rule`.

## Acceptance criteria

- [x] After `archive_rule({name: "X"})`, `.claude/rules/X.md` no longer exists.
- [x] `.claude/rules/archive/X.md` exists with identical content.
- [x] When the source file is missing, the call errors and writes nothing.
- [x] Files under `archive/` are excluded from `audit_rules` and `list_rules`.

## Testing

- **Unit (vitest)**: `archiveRule` unit test covers move and missing-file error.
- **Integration (vitest)**: round-trip through `add_rule` + `archive_rule` + `list_rules`.

## Notes / implementation hints

Move semantics — never delete. The user can manually restore by moving the file back.
