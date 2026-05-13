---
id: US-001
epic: EPIC-002-add-rule-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `add_rule` writes a properly-formatted rule file

As an **AI developer (or driving LLM)**, I want **to call `add_rule` with a name, title, rules, and optional `paths`**, so that **a properly-formatted `.claude/rules/<name>.md` is written without me hand-rolling YAML frontmatter**.

## Context

Anthropic's rule format requires optional `paths:` frontmatter, a title, a bullet list of rules, an optional `**Why:**` line, and optional good/bad examples. `addRule` renders this exactly.

**Existing implementation:** `addRule` in `src/core/rules.ts`; MCP wrapper `add_rule`.

## Acceptance criteria

- [x] Calling `add_rule({projectDir, name, title, rules})` writes `.claude/rules/<name>.md` with the title, rules bullets, and no frontmatter (unscoped rule).
- [x] When `paths` is provided, the file starts with `---\npaths:\n  - "<glob>"\n---` frontmatter.
- [x] When `reason` is provided, the file contains a `**Why:** <reason>` line.
- [x] When `goodExample` / `badExample` is provided, the file contains a `## Examples` section with `### Good` / `### Bad` subsections.
- [x] Re-calling with the same `name` errors unless `overwrite: true`.
- [x] Calling without a `name` or with a non-kebab-case `name` errors.

## Testing

- **Unit (vitest)**: `src/core/rules.test.ts` covers frontmatter rendering, examples handling, idempotency / overwrite, and validation.
- **Integration (vitest)**: MCP tool wrapper produces the same file end-to-end.

## Notes / implementation hints

Frontmatter is omitted entirely (not `paths: []`) when no scope is given.
