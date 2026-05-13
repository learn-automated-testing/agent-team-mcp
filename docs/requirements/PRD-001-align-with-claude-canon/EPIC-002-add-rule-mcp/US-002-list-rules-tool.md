---
id: US-002
epic: EPIC-002-add-rule-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-002 — `list_rules` enumerates installed rules with optional path filter

As an **AI developer**, I want **to call `list_rules({projectDir, pathFilter?})`**, so that **I can see every installed rule and optionally narrow to rules whose `paths:` match a path I care about**.

## Context

Once `.claude/rules/` has multiple files, users need a programmatic way to enumerate them. `listRules` reads the directory, parses each frontmatter, and returns a structured list.

**Existing implementation:** `listRules` in `src/core/rules.ts`; MCP wrapper `list_rules`.

## Acceptance criteria

- [x] Calling `list_rules({projectDir})` returns one entry per `.claude/rules/<name>.md`.
- [x] Each entry exposes `name`, `paths` (array, possibly empty), `title`.
- [x] When `pathFilter` is provided, only rules whose `paths:` glob matches the filter are returned.
- [x] Files under `.claude/rules/archive/` are excluded.
- [x] Empty / missing `.claude/rules/` returns an empty list, not an error.

## Testing

- **Unit (vitest)**: `src/core/rules.test.ts` covers parsing, `pathFilter` matching, and archive exclusion.
- **Integration (vitest)**: MCP tool wrapper round-trips through `add_rule` + `list_rules`.

## Notes / implementation hints

`pathFilter` matching uses the same glob semantics as the rule's own `paths:` frontmatter.
