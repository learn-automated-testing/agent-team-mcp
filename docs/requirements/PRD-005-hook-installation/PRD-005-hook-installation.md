# PRD-005 — Hook installation

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/hook-installation.md` (migrated to this hierarchy — see git history)

## Problem statement

Claude Code's `settings.json` hooks can enforce policy (pre/post tool use, stop, etc.), but skillsrepo installs agents and skills as prose only. Workflow gates, handoffs, and refinement triggers rely on the agents voluntarily following the guidance. In practice, steps get skipped or state drifts (e.g. `status: needs-fixes` in `state.json`, yet a commit lands anyway). Hooks are the one layer that can *enforce* the discipline rather than hope for it.

## Goal

`install_setup` optionally installs a curated set of Claude Code hooks alongside the team so that workflow status is enforced automatically and the installed skills stay fresh as the project evolves.

## Users

- **AI developers** — want enforced discipline, not prose recommendations.
- **Anyone burned by Claude deploying with red tests** — wants a commit-gate.

## Capabilities (high level)

- Stack-freshness hook that fires on `Edit`/`Write` to `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml` and warns about stale skill stack sections.
- State-validator hook (`Stop`) that warns when `.claude/state.json` is inconsistent with the turn's activity.
- Commit-gate hook (`.husky/pre-commit` or `.git/hooks/pre-commit`) that blocks commits when `state.json` status is `needs-fixes` or `blocked`.
- Hooks can be opted out with `install_setup({ hooks: false })`.
- Installed hooks live under `.claude/hooks/` and are user-readable / editable.

## Non-functional requirements

- **Settings-merge safety:** existing entries in `.claude/settings.json` are preserved byte-for-byte where possible.
- **Idempotency:** re-running install does not duplicate hook entries.
- **Fail-open:** hook script errors do not lock the user out — work proceeds.

## Out of scope

- `PreToolUse` hooks (complex, easy to make brittle).
- CI-side gates (handled by the devops agent).
- Hook telemetry / dashboard.

## Open questions

- Should the stack-freshness script auto-fire `refine_item`, or only warn? Safer to warn.
- If husky is detected, also install in `.git/hooks/` belt-and-braces, or trust husky alone?

## Success metrics

- In dogfooding, the stack section on each installed skill stays live without explicit `refine_item` in ≥ 90% of cases.
- Zero "wrong workflow step" commits (landing while `status: needs-fixes`) during a two-week test window.

---

## Epics

- [EPIC-007 — Hook installation](./EPIC-007-hooks-installation/EPIC-007-hooks-installation.md)
