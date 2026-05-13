---
id: US-003
epic: EPIC-004-target-resolution-and-trees
priority: must-have
status: done
testing: [integration]
---

# US-003 — `both` install writes full `.claude/` tree plus thin `.github/` bridge

As an **AI developer using both Claude Code and Copilot**, I want **the default `target_tooling=both` install to give me the full `.claude/` tree plus a minimal `.github/` bridge that points back to `.claude/`**, so that **I have one source of truth and Copilot can still find the team**.

## Context

`both` calls `writeClaudeTree` for the full Claude tree, plus `writeCopilotBridge` (bridge variant) for `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`. It does **not** mirror agents or skills under `.github/`.

**Existing implementation:** `installSetup` composition in `src/core/install.ts`.

## Acceptance criteria

- [x] After install with `target_tooling=both`, the full `.claude/` tree and `CLAUDE.md` exist.
- [x] `.github/copilot-instructions.md` (bridge variant, references `.claude/...`) and `.github/instructions/*.instructions.md` exist.
- [x] No file under `.github/agents/` or `.github/skills/` is created.
- [x] `report.target === "both"`.
- [x] Total `.github/` file count is small (≤ 4 for a typical TypeScript project).

## Testing

- **Integration (vitest)**: `src/core/install-target.test.ts` both-target and default-to-both contract tests.

## Notes / implementation hints

The bridge file references `.claude/...` paths — Copilot reads them natively, so duplication is unnecessary.
