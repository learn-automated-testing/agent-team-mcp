# PRD-003 — Dual-tool target (Claude Code + GitHub Copilot)

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/dual-tool-target.md` (migrated to this hierarchy — see git history)

## Problem statement

The MCP scaffolds a customization tree under `.claude/` (agents, skills, rules, `CLAUDE.md`). That tree is canonical for Claude Code, but a growing population of developers is restricted to GitHub Copilot in their primary IDE and cannot read `.claude/...` paths the same way. Both pre-existing options are bad: hand-port the tree to `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`, or skip the MCP entirely. There is no single command that produces a coherent customization layer for either engine — or both at once — without duplicating the source of truth.

## Goal

`install_setup` resolves a `target_tooling` answer of `claude`, `copilot`, or `both`, and writes exactly the file tree that target requires — defaulting to `both` because Copilot reads `.claude/skills/` and `CLAUDE.md` natively.

## Users

- **Solo developers** — want one source of truth across Claude Code and Copilot.
- **Engineering teams on Copilot** — want the MCP's scaffolding without `.claude/` files cluttering the repo.
- **Mixed teams** — want a bridge that does not duplicate agent or skill bodies.

## Capabilities (high level)

- `claude`-only installs write only `.claude/` plus `CLAUDE.md` (no `.github/` artefacts).
- `copilot`-only installs write a self-contained `.github/` tree (instructions, agents, skills, context); `.claude/` holds only MCP-internal state.
- `both` installs (the default) write the full `.claude/` tree plus a thin `.github/` bridge that points back to `.claude/skills/` and `.claude/agents/` instead of duplicating them.
- `recommend_setup` exposes `target_tooling` with `default: "both"` and the three explicit choices.
- In standalone Copilot mode, `.claude/...` references in agent/skill bodies are rewritten to their `.github/...` equivalents.
- Skip-warnings for stale-but-skipped files surface on the install report so users can spot drift.

## Non-functional requirements

- **Idempotency:** identical inputs with `overwrite=true` produce the same tree; with `overwrite=false`, every skip is recorded with a reason.
- **Atomicity:** per-file writes; a kill mid-install yields a partial-but-uncorrupted tree.
- **Performance:** total file count `O(plan.agents + plan.skills + C)`; install completes in well under one second.
- **No network I/O:** templates ship in the package; no HTTP, DNS, or auth.
- **Backward compatible:** no breaking changes to existing tool signatures; callers ignoring `target` get the `both` default.

## Out of scope

- Mirroring `.claude/rules/*.md` to `.github/instructions/*.instructions.md`.
- Generating Copilot-specific deployment metadata in `.agent.md` frontmatter.
- Translating Claude Code workflow primitives (`Task` fan-out) into Copilot equivalents.
- A `migrate` / `prune` command that flips an existing install between targets and removes stale files.
- A dry-run mode for `install_setup`.

## Open questions

- Should the `both` bridge file render an actual list of `.claude/rules/` paths, or stay generic? Currently generic.

## Success metrics

- A fresh `install_setup` run with each of the three `target_tooling` values produces a tree that passes `src/core/install-target.test.ts`.
- In `both` mode, file count under `.github/` is ≤ 4 for a typical TypeScript project; no agent or skill body duplicated.
- In `copilot` standalone mode, no file under `.github/agents/` or `.github/skills/` contains a literal `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, or `.claude/context.md` reference.
- `report.target` is set on every successful install and matches `resolveTargetTooling(answers)`.

> Architecture detail (module boundaries, contract surfaces, decision points, failure modes) lives in the two epics below.

---

## Epics

- [EPIC-004 — Target resolution and tree writers](./EPIC-004-target-resolution-and-trees/EPIC-004-target-resolution-and-trees.md)
- [EPIC-005 — Copilot rendering and skip-warnings](./EPIC-005-copilot-rendering-and-warnings/EPIC-005-copilot-rendering-and-warnings.md)
