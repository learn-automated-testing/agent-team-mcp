---
id: US-002
epic: EPIC-004-target-resolution-and-trees
priority: must-have
status: done
testing: [integration]
---

# US-002 — `copilot`-only install writes a self-contained `.github/` tree

As an **AI developer in a Copilot-only org**, I want **`install_setup` with `target_tooling=copilot` to write a self-contained `.github/` tree**, so that **Copilot can run my installed team without depending on `.claude/` files for user-facing content**.

## Context

`writeCopilotStandalone` writes `.github/agents/`, `.github/skills/`, `.github/context.md`. `writeCopilotBridge` (with `target=copilot`) writes the standalone instructions. Hooks are skipped because they have no Copilot equivalent.

**Existing implementation:** `writeCopilotStandalone` and `writeCopilotBridge` in `src/core/install.ts`.

## Acceptance criteria

- [x] After install with `target_tooling=copilot`, `.github/copilot-instructions.md` (standalone variant), `.github/instructions/*.instructions.md`, `.github/agents/<name>.agent.md`, `.github/skills/<name>/SKILL.md`, and `.github/context.md` all exist.
- [x] No file under `.claude/agents/`, `.claude/skills/`, or `.claude/rules/` is created.
- [x] No `CLAUDE.md` is created.
- [x] Hooks are not installed.
- [x] `report.target === "copilot"`.

## Testing

- **Integration (vitest)**: `src/core/install-target.test.ts` copilot-only contract test.

## Notes / implementation hints

`.claude/state.json` and `.claude/.skillsrepo.json` still land under `.claude/` — see US-004.
