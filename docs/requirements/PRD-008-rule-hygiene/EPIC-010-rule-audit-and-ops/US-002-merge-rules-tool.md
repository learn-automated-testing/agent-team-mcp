---
id: US-002
epic: EPIC-010-rule-audit-and-ops
priority: must-have
status: done
testing: [unit, integration]
---

# US-002 — `merge_rules` concatenates and unions paths, deletes sources

As an **AI developer with duplicate rules**, I want **`merge_rules({projectDir, into, from[], paths?})` to concatenate the bullets into one file and delete the sources**, so that **the directory stays small without manual file-juggling**.

## Context

`mergeRules` reads each `from` file, concatenates bullets into the `into` file, unions the `paths:` (or uses the explicit `paths` arg), then deletes the source files. Errors when sources are missing or the target exists without `overwrite`.

**Existing implementation:** `src/core/rule-ops.ts`; MCP wrapper `merge_rules`.

## Acceptance criteria

- [x] After `merge_rules`, the `into` file contains every bullet from each source file.
- [x] The `into` file's `paths:` is the union of source paths (or the explicit `paths` arg).
- [x] Each `from` file no longer exists in `.claude/rules/`.
- [x] When a source file is missing, the call errors and writes nothing.
- [x] When the target exists and `overwrite` is not true, the call errors.

## Testing

- **Unit (vitest)**: `src/core/audit.test.ts` (or adjacent) covers merge concatenation and path-union behaviour.
- **Integration (vitest)**: MCP tool wrapper smoke on a fixture directory.

## Notes / implementation hints

Merge is destructive on sources by design — the user invokes it explicitly.
