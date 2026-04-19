# PRD: hook installation

## Problem statement
Claude Code's `settings.json` hooks can enforce policy — pre/post tool use, stop, etc. —
but skillsrepo installs agents and skills as prose only. Workflow gates, handoffs, and
refinement triggers rely on the agents voluntarily following the guidance. In practice,
steps get skipped or state drifts (e.g. `status: needs-fixes` in `state.json`, yet a
commit lands anyway). Hooks are the one layer that can *enforce* the discipline rather
than hope for it.

## Goal
Optionally install a set of Claude Code hooks alongside the team so that workflow status
is enforced automatically, and the installed skills stay fresh as the project evolves.

## Users
- AI developers who want enforced discipline, not just prose recommendations
- Anyone who has been burned by Claude deploying while tests were red

## User stories
- **must-have** As an AI developer, when I add or remove a dependency in `package.json`, a hook fires that lists which installed skills now have a stale "Detected stack" section.
- **must-have** As an AI developer, when `state.json` has `status: "needs-fixes"`, a pre-commit hook blocks the commit and tells me which step is owed.
- **must-have** As an AI developer, I can opt out of hooks entirely with `install_setup({ hooks: false })`, because some teams manage hooks centrally.
- **should-have** As an AI developer, I can see which hooks skillsrepo installed and inspect them under `.claude/hooks/`.

## Functional requirements
1. New core module `src/core/install-hooks.ts` with `mergeHooks({settingsPath, hooks})` that reads existing `.claude/settings.json`, merges new hook entries, preserves anything pre-existing.
2. Ship three hook definitions:
   - **Stack-freshness hook** — `PostToolUse` on `Edit`/`Write` matching `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`; runs a bundled node script that prints stale-skill warnings to the user.
   - **State validator hook** — `Stop` hook that reads `.claude/state.json` and warns if status is inconsistent (e.g. `current_step: "test"` but no test activity in the turn).
   - **Commit-gate hook** — installed under `.husky/pre-commit` (if husky detected) or `.git/hooks/pre-commit` (if not); blocks commit when `status: "needs-fixes"` or `"blocked"`.
3. `install_setup` accepts `hooks?: boolean` (default `true`); when false, skip hook installation.
4. Hook installation is idempotent — re-running doesn't duplicate entries in settings.json.
5. Report in install output which hooks were added vs. left alone.

## Non-functional requirements
- Settings merge is safe: unrelated hook entries in `.claude/settings.json` must be preserved byte-for-byte where possible.
- The bundled hook scripts are standalone files the user can read and edit.
- Hooks fail open: if a hook script errors, commit/work proceeds rather than locking the user out.

## Out of scope
- `PreToolUse` hooks (complex, rarely useful, easy to make brittle)
- CI-side gates (separate concern, handled in the devops agent)
- Hook telemetry / dashboard (wait until the dashboard exists)

## Open questions
- Should the stack-freshness script auto-fire `refine_item`, or only warn? Safer to warn, but slower feedback loop.
- If the user has husky, do we also install in `.git/hooks/` as a belt-and-braces, or trust husky alone?

## Success metrics
- In dogfooding, the stack section on each installed skill stays live without an explicit `refine_item` call in ≥ 90% of cases.
- Zero "wrong workflow step" commits (landing while `status: needs-fixes`) during a two-week test window.
