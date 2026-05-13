# EPIC-005 — Copilot rendering and skip-warnings

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-003-dual-tool-target.md

## Problem statement

Standalone Copilot output that contained literal `.claude/...` paths would break Copilot's internal navigation. And the `overwrite=false` install flow silently kept stale files on disk — the install reported success, but the runtime ran on outdated content.

## Goal

In standalone Copilot mode, agent and skill bodies are rewritten through a closed prefix table so internal links land under `.github/...`. The standalone instructions explicitly point Copilot at `.claude/state.json`. And every install records actionable skip-warnings on the report.

## Scope (v1)

**In scope**
- `PATH_REWRITES` table covering exactly four prefixes: `.claude/skills/` → `.github/skills/`, `.claude/agents/` → `.github/agents/`, `.claude/rules/` → `.github/instructions/`, `.claude/context.md` → `.github/context.md`.
- `rewriteAgentForCopilot` (strip `isolation:` frontmatter + apply `rewriteClaudePaths`).
- Standalone `.github/copilot-instructions.md` template that explicitly tells Copilot workflow state lives at `.claude/state.json`.
- `report.warnings: Array<{kind, name, path, reason}>` populated when an install plan would have written a file but skipped it because `overwrite=false`. Distinct from `report.skipped`.

**Out of scope**
- Mirroring `.claude/rules/*.md` to `.github/instructions/*.instructions.md` per project.
- Translating Claude workflow primitives into Copilot equivalents.

## Users

- **AI developer (Copilot standalone)** — needs internal links that work and a clear pointer to `.claude/state.json`.
- **AI developer rerunning install** — needs to know which files were stale-and-skipped without diffing manually.

## User stories

### Must-have
- [US-001 — Copilot standalone bodies rewrite four `.claude/...` prefixes](./US-001-copilot-path-rewrites.md)
- [US-002 — Standalone instructions point Copilot at `.claude/state.json`](./US-002-standalone-state-pointer.md)
- [US-003 — Skip-warnings appear on `report.warnings`](./US-003-skip-warnings-in-report.md)

## Testing scope

Integration in `src/core/install-target.test.ts` — `rewriteClaudePaths` contract test asserts no `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, or `.claude/context.md` literals remain in any standalone Copilot file. Skip-warning behaviour asserted on the install report.

## Decisions (recorded 2026-05-10)

1. `PATH_REWRITES` is closed — adding a prefix requires an ADR.
2. `.claude/state.json` and `.claude/.skillsrepo.json` are deliberately not rewritten — they are still written under `.claude/` in standalone mode.
3. `report.warnings` is the actionable subset of `report.skipped` (only stale-file / user-edited reasons surface here).

## Open questions

1. Whether the `both` bridge file should render an actual list of `.claude/rules/` paths — currently generic to avoid re-rendering on every rule add.

## Success metrics

- Zero `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, or `.claude/context.md` literals in any file under `.github/agents/` or `.github/skills/` in standalone mode.
- `report.warnings` non-empty signals on-disk drift; empty signals the on-disk tree matches the plan.

---

**Relation with other epics:**
- [EPIC-004 — Target resolution and trees](../EPIC-004-target-resolution-and-trees/EPIC-004-target-resolution-and-trees.md) — provides the tree writers this epic's rewrites and warnings hook into.
