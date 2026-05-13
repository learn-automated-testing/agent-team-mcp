---
id: US-001
epic: EPIC-004-target-resolution-and-trees
priority: must-have
status: done
testing: [integration]
---

# US-001 — `claude`-only install writes only `.claude/` plus `CLAUDE.md`

As an **AI developer in a Claude-only org**, I want **`install_setup` with `target_tooling=claude` to write only `.claude/` and `CLAUDE.md`**, so that **no `.github/` artefacts pollute my repo**.

## Context

`writeClaudeTree` owns the entire `.claude/` user-facing surface plus `CLAUDE.md`. With `target=claude`, the Copilot writers are skipped entirely.

**Existing implementation:** `writeClaudeTree` in `src/core/install.ts`; routing via `shouldWriteClaudeTree` / `shouldWriteCopilotBridge` / `shouldWriteCopilotStandalone`.

## Acceptance criteria

- [x] After install with `target_tooling=claude`, `.claude/agents/`, `.claude/skills/`, `.claude/rules/`, `.claude/context.md`, and `CLAUDE.md` all exist.
- [x] No file under `.github/` is created.
- [x] `report.target === "claude"`.
- [x] `report.written` lists each `.claude/` artefact with stable `kind` strings (`agent`, `skill`, …).

## Testing

- **Integration (vitest)**: `src/core/install-target.test.ts` claude-only contract test.

## Notes / implementation hints

Hooks still install in `claude` mode — the skip rule only triggers on `copilot`-only.
