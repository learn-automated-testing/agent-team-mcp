# EPIC-004 — Target resolution and tree writers

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-003-dual-tool-target.md

## Problem statement

`install_setup` only wrote a `.claude/` tree. Copilot-only users had no installable surface, and mixed-tool teams had to choose. There was no single resolved value that downstream callers could branch on, and no separation between "user-facing customization" and "MCP-internal state".

## Goal

`installSetup` resolves a `target_tooling` answer (`claude` | `copilot` | `both`) through a single `resolveTargetTooling` function and routes to one of three pure tree-writers, while always writing MCP-internal state under `.claude/` regardless of target.

## Scope (v1)

**In scope**
- `TargetTooling` type and `resolveTargetTooling(answers)` (defaults unknown to `"both"`).
- `target_tooling` open question on `recommend_setup` with `default: "both"`.
- Three pure predicates: `shouldWriteClaudeTree`, `shouldWriteCopilotBridge`, `shouldWriteCopilotStandalone`.
- Tree writers: `writeClaudeTree`, `writeCopilotBridge`, `writeCopilotStandalone`.
- `.claude/state.json` and `.claude/.skillsrepo.json` always under `.claude/`.
- Hooks skipped when `target === "copilot"`.
- `report.target: TargetTooling` exposed on every install.

**Out of scope**
- Path-rewrite logic and skip-warnings (covered by EPIC-005).
- A `migrate` / `prune` command to clean stale files when switching target.

## Users

- **AI developer (Claude-only org)** — wants only `.claude/` plus `CLAUDE.md`.
- **AI developer (Copilot-only org)** — wants a self-contained `.github/` tree.
- **AI developer using both** — wants the bridge default.
- **Driving LLM** — installs without prompting the human in routine cases.

## User stories

### Must-have
- [US-001 — `claude`-only install writes only `.claude/` plus `CLAUDE.md`](./US-001-claude-only-target.md)
- [US-002 — `copilot`-only install writes only the `.github/` tree (state still under `.claude/`)](./US-002-copilot-only-target.md)
- [US-003 — `both` install writes full `.claude/` tree plus `.github/` bridge](./US-003-both-target-with-bridge.md)
- [US-004 — `.claude/state.json` and `.claude/.skillsrepo.json` always under `.claude/`](./US-004-state-and-metadata-always-claude.md)

## Testing scope

Integration in `src/core/install-target.test.ts` — six contract tests covering default-to-both, claude-only, copilot-only, both, copilot-agent path-rewrite contract, and MCP-internal state always landing under `.claude/`.

## Decisions (recorded 2026-05-10)

1. Default target is `"both"` — bridge cost is two static files, no body duplication.
2. `.claude/state.json` and `.claude/.skillsrepo.json` stay under `.claude/` in copilot-only mode (MCP-internal, not user-facing).
3. Hooks skip in copilot-only mode (no Copilot equivalent).
4. Three subroutines, not one parameterised function — each reads top-to-bottom as the exact files written for that target.

## Open questions

None at v1 release.

## Success metrics

- All six contract tests in `install-target.test.ts` pass.
- `report.target` is set on every successful install.

---

**Relation with other epics:**
- [EPIC-005 — Copilot rendering and warnings](../EPIC-005-copilot-rendering-and-warnings/EPIC-005-copilot-rendering-and-warnings.md) — owns the body-rewriting and skip-warning concerns this epic delegates.
