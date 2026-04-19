# PRD: align with Claude-native conventions

## Problem statement
skillsrepo invented a custom layer (`.claude/context.md`) for project context and was
on the verge of inventing another (`.claude/conventions/`) for coding rules. Anthropic's
official docs define canonical mechanisms that already cover both: `CLAUDE.md` files
(auto-loaded, team-shared), `.claude/rules/*.md` with `paths:` frontmatter (path-scoped
rules), and per-skill `references/` + `examples/` subdirectories (third-level progressive
disclosure per the skills guide). Our current install writes none of these, so rules live
in agent prose and coding standards have no structured home.

## Goal
Make `install_setup` produce a team that fits Anthropic's canonical layout: a root
`CLAUDE.md`, a `.claude/rules/` directory for path-scoped rules, and `references/` +
`examples/` subfolders for every installed skill. Add MCP tools for authoring rules the
canonical way.

## Users
- AI developers who want Claude Code to auto-load their project conventions without
  training each agent individually
- Teams wanting version-controlled, path-scoped coding standards

## User stories
- **must-have** After `install_setup`, a `CLAUDE.md` exists at the repo root with a terse
  project summary and an `@.claude/context.md` import — auto-loaded into every session.
- **must-have** A `.claude/rules/` directory exists and is referenced from `CLAUDE.md`.
- **must-have** I can call `add_rule({projectDir, name, paths?, title, rules, reason?,
  goodExample?, badExample?})` and it writes a properly-formatted `.claude/rules/<name>.md`
  with YAML `paths:` frontmatter when a scope is given.
- **must-have** I can call `list_rules({projectDir, pathFilter?})` and see every installed
  rule; `pathFilter` limits to rules whose `paths:` match.
- **must-have** Every installed skill has empty `references/` and `examples/` subdirs so
  there is a canonical place to drop detailed guidance without inventing one.
- **should-have** `install_setup` leaves an existing `CLAUDE.md` alone unless `overwrite`
  is true — user's hand-written root instructions are precious.

## Functional requirements
1. New template `templates/CLAUDE.md.tmpl` rendered at install time — under 50 lines,
   imports `.claude/context.md` via `@` syntax, lists the installed team, points at
   `.claude/rules/` for path-scoped conventions.
2. `install_setup` creates:
   - `CLAUDE.md` at `outDir/CLAUDE.md` (skip if exists and `overwrite` false)
   - `.claude/rules/` directory (empty)
   - `.claude/skills/<name>/references/` and `.claude/skills/<name>/examples/` for each
     installed skill and workflow-skill
   - Report additions under a new `layout` section of the install report
3. New `src/core/rules.ts` with:
   - `addRule({ projectDir, name, paths?, title, rules, reason?, goodExample?, badExample?, overwrite? })`
   - `listRules({ projectDir, pathFilter? })`
4. New MCP tools `add_rule` and `list_rules` wrapping the core functions.
5. Rule file format:
   ```markdown
   ---
   paths:
     - "src/**/*.ts"
   ---

   # {{title}}

   ## Rules

   - {{rule 1}}
   - {{rule 2}}

   **Why:** {{reason}}

   ## Examples

   ### Good
   ```lang
   {{goodExample}}
   ```

   ### Bad
   ```lang
   {{badExample}}
   ```
   ```
   - Frontmatter is omitted entirely when no `paths` given (rule applies unconditionally).
   - Examples sections omitted when none provided.

## Non-functional requirements
- CLAUDE.md under Anthropic's 200-line guidance.
- Rule-file writes are idempotent — rerun with same name errors unless `overwrite` true.
- Never clobber existing `CLAUDE.md`, `.claude/rules/*.md`, or skill `references/examples`
  without explicit `overwrite`.

## Out of scope
- Auto-migrating `.claude/context.md` content into `CLAUDE.md` (context.md stays as the
  long-form detail; CLAUDE.md imports it)
- Automated enforcement of rules (that's PRD 2's hook layer, separately)
- `add_example` / `add_reference` tools for filling skill subdirs (future PRD if needed)
- `capture_lesson` → rule promotion (future)

## Open questions
- Should subfolder `CLAUDE.md` files be generated automatically from rules with a single
  matching `paths:` pattern? Probably not — keeps the model simpler.
- What happens when a user's existing `CLAUDE.md` already has a `## Conventions` section
  we'd be duplicating? v1 just skips writing; user merges manually.

## Success metrics
- Installed projects have Claude auto-loading project context (via CLAUDE.md) within one
  session of installation, no explicit agent-side prompt required.
- Users author ≥ 2 rules via `add_rule` in the first week of adoption.
- Zero data-loss incidents from `CLAUDE.md` or rule-file overwrites in dogfooding.
