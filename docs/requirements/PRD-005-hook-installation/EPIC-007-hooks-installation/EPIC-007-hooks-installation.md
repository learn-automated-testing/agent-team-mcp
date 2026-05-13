# EPIC-007 — Hook installation

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-005-hook-installation.md

## Problem statement

skillsrepo had no enforcement layer — workflow gates lived in agent prose. Steps got skipped, state drifted, and commits landed while `state.json` said `needs-fixes`.

## Goal

`install_setup` ships three Claude Code hooks (stack-freshness, state-validator, commit-gate) wired into `.claude/settings.json` (or `.husky/pre-commit` / `.git/hooks/pre-commit` for the commit gate), is opt-out-able, idempotent on re-run, and reports in the install output which hooks were added.

## Scope (v1)

**In scope**
- `mergeHooks({settingsPath, hooks})` core that preserves pre-existing entries.
- Three bundled hook scripts: stack freshness (`PostToolUse` on `Edit`/`Write` to `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`), state validator (`Stop`), commit gate (`pre-commit`).
- `install_setup({hooks: false})` opt-out.
- Idempotent merge — re-running does not duplicate hook entries.
- Report which hooks were added vs left alone.

**Out of scope**
- `PreToolUse` hooks.
- CI-side gates.
- Hook telemetry / dashboard.

## Users

- **AI developer** — wants enforced discipline, not prose.
- **Developer who has been burned by deploying with red tests** — needs the commit-gate.

## User stories

### Must-have
- [US-001 — Stack-freshness hook fires on dependency-file edits](./US-001-stack-freshness-hook.md)
- [US-002 — State-validator `Stop` hook warns on inconsistency](./US-002-state-validator-hook.md)
- [US-003 — Commit-gate hook blocks commit on `needs-fixes` / `blocked`](./US-003-commit-gate-hook.md)

### Should-have
- [US-004 — `install_setup({hooks: false})` opts out cleanly](./US-004-hooks-opt-out.md)

## Testing scope

Unit on `mergeHooks` (settings.json merge preservation, idempotency); integration on the install report listing the hooks added.

## Decisions (recorded 2026-05-10)

1. Hooks fail open — script error does not lock the user out.
2. Settings merge preserves unrelated entries byte-for-byte where possible.
3. Hook scripts ship as readable / editable standalone files under `.claude/hooks/`.

## Open questions

1. Should stack-freshness auto-fire `refine_item` or only warn? Currently warn.
2. With husky present, also install `.git/hooks/` belt-and-braces, or trust husky alone?

## Success metrics

- Stack section on each installed skill stays live without explicit `refine_item` in ≥ 90% of dogfooding cases.
- Zero "wrong workflow step" commits during a two-week test window.

---

**Relation with other epics:**
- [EPIC-004 — Target resolution and trees](../EPIC-004-target-resolution-and-trees/EPIC-004-target-resolution-and-trees.md) — hooks skip when `target === "copilot"`.
