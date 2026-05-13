---
id: US-002
epic: EPIC-001-claude-canon-layout
priority: must-have
status: done
testing: [integration]
---

# US-002 — `.claude/rules/` directory installed and referenced

As an **AI developer**, I want **`.claude/rules/` to exist after install and be referenced from `CLAUDE.md`**, so that **path-scoped rules have a canonical home Claude Code already knows about**.

## Context

Anthropic's rules convention loads any `.claude/rules/*.md` automatically (with optional `paths:` frontmatter for path-scoping). The installer creates the empty directory and `CLAUDE.md` references it explicitly so future `add_rule` writes have an obvious target.

**Existing implementation:** ensured by `writeClaudeTree` in `src/core/install.ts`.

## Acceptance criteria

- [x] After `install_setup`, `outDir/.claude/rules/` exists (even if empty).
- [x] `CLAUDE.md` references `.claude/rules/` as the home for path-scoped conventions.
- [x] The install report includes the rules directory under its `layout` (or written) section.

## Testing

- **Integration (vitest)**: `install_setup` smoke asserts directory existence and `CLAUDE.md` content.

## Notes / implementation hints

Empty directory is intentional — rules are user-authored via `add_rule`.
