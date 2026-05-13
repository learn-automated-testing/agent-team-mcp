# PRD-001 — Align with Claude-native conventions

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/align-with-claude-canon.md` (migrated to this hierarchy — see git history)

## Problem statement

skillsrepo invented a custom layer (`.claude/context.md`) for project context and was on the verge of inventing another (`.claude/conventions/`) for coding rules. Anthropic's official docs already define canonical mechanisms covering both: `CLAUDE.md` files (auto-loaded, team-shared), `.claude/rules/*.md` with `paths:` frontmatter (path-scoped rules), and per-skill `references/` + `examples/` subdirectories (third-level progressive disclosure). The current install writes none of these — rules live in agent prose and coding standards have no structured home.

## Goal

A team installer produces a layout that fits Anthropic's canonical structure (`CLAUDE.md`, `.claude/rules/`, per-skill `references/` + `examples/`), and provides MCP tools for authoring rules the canonical way.

## Users

- **AI developers** — want Claude Code to auto-load project conventions without training each agent individually.
- **Engineering teams** — want version-controlled, path-scoped coding standards.

## Capabilities (high level)

- Auto-loaded `CLAUDE.md` at the repo root that imports `.claude/context.md` and points at `.claude/rules/`.
- Canonical `.claude/rules/` directory installed and referenced from `CLAUDE.md`.
- Per-skill `references/` and `examples/` subdirectories on every installed skill.
- No-clobber semantics for an existing hand-written `CLAUDE.md`.
- `add_rule` MCP tool that writes a properly-formatted rule file with optional `paths:` frontmatter.
- `list_rules` MCP tool that lists every installed rule and supports a `pathFilter`.

## Non-functional requirements

- **Performance:** install completes in well under one second on a typical project.
- **Safety:** never clobber an existing `CLAUDE.md`, rule file, or skill subdirectory without explicit `overwrite`.
- **File size:** `CLAUDE.md` stays under Anthropic's 200-line guidance.
- **Idempotency:** rule writes with the same name error unless `overwrite: true`.

## Out of scope

- Auto-migrating `.claude/context.md` content into `CLAUDE.md`.
- Automated enforcement of rules (covered by the hooks PRD).
- `add_example` / `add_reference` tools for skill subfolders.
- `capture_lesson` → rule promotion (covered separately).

## Open questions

- Auto-generating sub-folder `CLAUDE.md` files from a single matching `paths:` rule — deferred for simplicity.
- Behaviour when a hand-written `CLAUDE.md` already has a duplicate `## Conventions` section — v1 skips and the user merges manually.

## Success metrics

- Installed projects have Claude auto-loading project context within one session of installation.
- Users author ≥ 2 rules via `add_rule` in the first week of adoption.
- Zero data-loss incidents from `CLAUDE.md` or rule-file overwrites.

---

## Epics

- [EPIC-001 — Claude canon layout](./EPIC-001-claude-canon-layout/EPIC-001-claude-canon-layout.md)
- [EPIC-002 — `add_rule` + `list_rules` MCP tools](./EPIC-002-add-rule-mcp/EPIC-002-add-rule-mcp.md)
