# EPIC-001 — Claude canon layout

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-001-align-with-claude-canon.md

## Problem statement

`install_setup` previously wrote agents and skills only — no canonical Claude-loaded `CLAUDE.md`, no `.claude/rules/` directory, no per-skill `references/` / `examples/` subfolders. As a result, project context was not auto-loaded into Claude Code sessions, path-scoped rules had no home, and there was no canonical place to drop deep skill detail.

## Goal

After `install_setup`, an installed project has a `CLAUDE.md` at the repo root that imports `.claude/context.md`, an empty `.claude/rules/` directory referenced from `CLAUDE.md`, and `references/` + `examples/` subfolders on every installed skill — and existing hand-written `CLAUDE.md` files are never clobbered.

## Scope (v1)

**In scope**
- Render a `templates/CLAUDE.md.tmpl` (under 50 lines) at install time.
- Create `.claude/rules/` (empty) and per-skill `references/` + `examples/` directories.
- Add a `layout` section to the install report.
- Skip writing `CLAUDE.md` when one exists unless `overwrite: true`.

**Out of scope**
- MCP tools for authoring rules (covered by EPIC-002).
- Auto-mirroring `.claude/context.md` content into `CLAUDE.md`.
- Auto-generating subfolder `CLAUDE.md` files.

## Users

- **AI developer** — installs the team and immediately gets project context auto-loaded into every Claude Code session.
- **Engineering team** — wants a canonical home for path-scoped rules and deep skill detail.

## User stories

### Must-have
- [US-001 — `CLAUDE.md` template rendered at install time](./US-001-claude-md-template.md)
- [US-002 — `.claude/rules/` directory installed](./US-002-rules-directory-installed.md)
- [US-003 — Per-skill `references/` + `examples/` subfolders](./US-003-skill-references-examples-dirs.md)

### Should-have
- [US-004 — Existing `CLAUDE.md` is never clobbered](./US-004-claude-md-no-clobber.md)

## Testing scope

Integration coverage in `src/core/install-target.test.ts` and adjacent install tests; behaviour is observable through the install report and the on-disk file tree.

## Decisions (recorded 2026-05-10)

1. `CLAUDE.md` imports `.claude/context.md` via `@` syntax — context stays the long-form detail, `CLAUDE.md` stays terse.
2. Empty `references/` / `examples/` subfolders ship — they are the canonical place for third-level disclosure.

## Open questions

1. Whether to ship a default `## Conventions` section in `CLAUDE.md` (currently no — rules live in `.claude/rules/`).

## Success metrics

- Installed projects have Claude auto-loading project context within one session.
- Zero data-loss incidents from `CLAUDE.md` overwrites in dogfooding.

---

**Relation with other epics:**
- [EPIC-002 — `add_rule` + `list_rules`](../EPIC-002-add-rule-mcp/EPIC-002-add-rule-mcp.md) — populates the `.claude/rules/` directory created here.
