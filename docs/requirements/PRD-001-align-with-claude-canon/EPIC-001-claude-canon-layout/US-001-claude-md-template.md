---
id: US-001
epic: EPIC-001-claude-canon-layout
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `CLAUDE.md` template rendered at install time

As an **AI developer**, I want **a `CLAUDE.md` to exist at the repo root after install**, so that **Claude Code auto-loads project context into every session without me prompting it**.

## Context

Anthropic's CLAUDE.md convention auto-loads root instructions into every session. The installer renders `templates/CLAUDE.md.tmpl` to `outDir/CLAUDE.md` with a terse summary, an `@.claude/context.md` import, and a pointer to `.claude/rules/`.

**Existing implementation:** `templates/CLAUDE.md.tmpl`; rendered by `writeClaudeTree` in `src/core/install.ts`.

## Acceptance criteria

- [x] After `install_setup`, `outDir/CLAUDE.md` exists.
- [x] The file is under 50 lines and under Anthropic's 200-line ceiling.
- [x] The file imports `.claude/context.md` via `@` syntax.
- [x] The file references `.claude/rules/` as the home for path-scoped conventions.
- [x] The install report lists `CLAUDE.md` under `report.written` with kind `claude-md` (or equivalent stable identifier).

## Testing

- **Unit (vitest)**: template renderer returns the expected body for a known fingerprint.
- **Integration (vitest)**: `install_setup` smoke produces a `CLAUDE.md` matching the criteria above.

## Notes / implementation hints

The `@.claude/context.md` import is the mechanism that keeps `CLAUDE.md` terse — long-form detail stays in `context.md`.
