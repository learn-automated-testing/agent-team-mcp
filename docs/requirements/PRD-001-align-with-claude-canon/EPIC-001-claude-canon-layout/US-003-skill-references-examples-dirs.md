---
id: US-003
epic: EPIC-001-claude-canon-layout
priority: must-have
status: done
testing: [integration]
---

# US-003 — Per-skill `references/` and `examples/` subfolders

As an **AI developer**, I want **every installed skill to have empty `references/` and `examples/` subfolders**, so that **there is a canonical place to drop deep guidance without inventing one**.

## Context

Anthropic's skills guide describes third-level progressive disclosure via per-skill `references/` and `examples/` subdirectories. The installer ensures both directories exist for every installed skill and workflow-skill.

**Existing implementation:** ensured by the skill writer in `src/core/install.ts`.

## Acceptance criteria

- [x] For every installed skill `<name>`, `outDir/.claude/skills/<name>/references/` exists.
- [x] For every installed skill `<name>`, `outDir/.claude/skills/<name>/examples/` exists.
- [x] Existing files inside those folders are left untouched on re-install.
- [x] The install report's `layout` section enumerates each created subdirectory.

## Testing

- **Integration (vitest)**: install fixture asserts both directories exist for every installed skill.

## Notes / implementation hints

Empty directories are intentional — third-level detail is user-authored.
