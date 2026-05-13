# PRD-012 — Language-aware rule recommendations at install time

> **Status:** draft (2026-05-13)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source material:** internal — surfaced 2026-05-13 while installing into `ai-documentgen-agent` (Python). The repo's own `.claude/rules/` has TypeScript-specific rules (`ts-*`) that would be wrong for the Python target, but the install left `.claude/rules/` empty anyway because `recommend.ts` never plans any rules.

## Problem statement

The MCP ships a **37-template rule library** at `templates/rule-library.json` covering TypeScript, JavaScript, Go, Rust, React, Next.js, Python, pytest, generic testing, accessibility, security, API, database, and git conventions. Users can install rules one-by-one via `install_rule_from_template`. But `recommend.ts` plans only agents + skills + workflows — never rules — so a fresh `install_setup` leaves `.claude/rules/` empty. Every new project has to manually pick a starter pack, and the obvious win (Python project → Python rules, TS project → TS rules) is left on the table.

## Goal

`install_setup` writes a starter rule pack chosen automatically from the rule library, driven by the project's fingerprint (primary language, test frameworks, database presence, frontend presence). Universal rules (no-secrets, commit-format, pr-size, input-validation) always ship. Language-specific rules only ship for languages the project actually uses. The pack is the floor, not the ceiling — users can still archive, merge, or add rules via the existing MCP tools.

## Users

- **AI developers** running `install_setup` on a new project — get a working rule baseline instead of an empty folder.
- **Team leads** standardising conventions across multiple projects in the same language — get the same starter pack every install.

## Capabilities (high level)

- Users can run `install_setup` on a Python project and find Python-flavoured rules (`py-type-hints`, `py-format-black`, `pytest-fixtures`, `pytest-parametrize` if pytest is detected) installed under `.claude/rules/`.
- Users can run `install_setup` on a TypeScript project and find TS-flavoured rules (`ts-strict-typing`, `ts-file-length`, `ts-async-error-handling`) installed.
- Users can run `install_setup` on a Go or Rust project and find the corresponding rule pack.
- Universal rules (`no-secrets-in-code`, `commit-format`, `pr-size`, `test-naming`, `test-one-assertion`, `test-flake-tolerance`) install regardless of language.
- Database-detected projects also get `parameterized-sql` and `db-utc-timestamps`.
- Frontend-detected projects also get `a11y-wcag-level` and `semantic-html`.
- The install report lists which rules were installed and why (mirrors the `agents` / `skills` reasons already in the report).

## Non-functional requirements

- **Idempotent.** Re-running `install_setup` with `overwrite=false` skips existing rule files; with `overwrite=true` replaces them.
- **No new MCP tools.** Reuses `installRuleFromTemplate` internally; the only API surface change is the install report's `rules` field.
- **Respects the rule library.** Never invents rules — only installs templates that exist in `templates/rule-library.json`. If a referenced template is missing, fail loudly.
- **Floor not ceiling.** Users keep full control: archive via `archive_rule`, merge via `merge_rules`, add more via `install_rule_from_template`, customise via `refine_item`.

## Out of scope

- Auto-tuning rule *content* per project (e.g. flipping `max_lines` from 300 to 500). The library has parameterised questions; v1 uses defaults. Users tune via `refine_item` or by editing the file.
- Auto-applying lessons from `mine_memory` as rules at install time. That's PRD-002's territory and stays an explicit user step.
- Mirroring rules into `.github/instructions/*.instructions.md` for Copilot. That's PRD-003 Out of Scope and stays that way.

## Open questions

- For a multi-language repo (TS + Python, e.g. a TS server with Python ML scripts), do we install both packs or only the primary's? — v1: only the primary's, secondary languages get tagged in the install report but no rules; revisit if it bites.
- Should the test-rules pack auto-shrink when no test framework is detected? — v1: yes, the universal `test-*` rules still install (they're framework-agnostic) but framework-specific ones (`pytest-fixtures`, `pytest-parametrize`) only install when the matching framework is detected.

## Success metrics

- `install_setup` on `ai-documentgen-agent` (Python) writes ≥ 4 Python-relevant rules + the universal set, none of them prefixed `ts-`, `js-`, `go-`, or `rust-`.
- `install_setup` on this repo (TypeScript) writes the existing `ts-*` set without manual intervention.
- The install report's `rules` field is non-empty for every project with a detected primary language.

---

## Epics

- [EPIC-015 — Install-time rule recommendations](./EPIC-015-rule-recommendations/EPIC-015-rule-recommendations.md)
