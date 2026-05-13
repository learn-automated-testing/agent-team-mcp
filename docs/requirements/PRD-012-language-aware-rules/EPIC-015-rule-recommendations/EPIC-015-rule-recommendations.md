# EPIC-015 — Install-time rule recommendations

> **Status:** draft (2026-05-13)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-012-language-aware-rules.md

## Problem statement

`recommend.ts` returns a `SetupPlan` with `agents`, `skills`, and `skippedAgents` / `skippedSkills` — but no rules. `install.ts` consequently never writes any rule files. The rule library exists; it just isn't wired in.

## Goal

`recommendSetup(fp)` returns a `rules: PlannedRule[]` field. `installSetup` reads it, calls `installRuleFromTemplate` per entry, and records the result in `report.rules`. The pack is chosen by the fingerprint.

## Scope (v1)

**In scope**
- Extend `SetupPlan` with `rules: PlannedRule[]` and `skippedRules: { id, reason }[]`.
- New `PlannedRule { id, reason, confidence }` type (mirrors `PlannedSkill`).
- Add a `recommendRules(fp)` helper that maps fingerprint → rule-template ids.
- Wire `installSetup` to install each planned rule via the existing `addRule` machinery (so the existing dedup + overwrite semantics are reused).
- Extend the `InstallReport` with `rules: Array<{ id; path }>` and the matching `skipped` entries.

**Out of scope**
- Parameterising rule content (e.g. tuning `max_lines`) at install time — uses library defaults only.
- Auto-mirroring to `.github/instructions/`.
- Recommending rules from `mine_memory` candidates.

## Users

- **AI developer running `install_setup`** — gets a useful starter rule pack.
- **`audit-report` consumer (PRD-008 EPIC-011)** — sees populated rule counts on day-one.

## User stories

### Must-have
- [US-001 — Fingerprint drives an auto-installed rule pack](./US-001-fingerprint-driven-rule-pack.md)

## Milestones

| # | Focus | Stories |
|---|---|---|
| MH-1 | Rules ship at install | US-001 |

## Testing scope

Unit + integration in `src/core/recommend.test.ts` (or `src/core/rule-recommendation.test.ts` if a new file is needed) and `src/core/install-target.test.ts`. Assert: language → pack mapping; universal-rules always included; test-framework-specific rules gated on detection; idempotency on re-run; install-report `rules` field is populated; rule template referenced but missing from the library → fails loudly.

## Decisions (recorded 2026-05-13)

1. Reuse the existing rule library — no new rule files needed in this epic.
2. Reuse `addRule` for writing — same dedup + overwrite path as the manual MCP tool.
3. Floor not ceiling: archive/merge/refine still work as today; the auto-install just seeds.

## Open questions

1. Multi-language repos → only the primary's pack ships in v1. Confirmed in PRD.

## Success metrics

- Empty `.claude/rules/` after a fresh `install_setup` becomes impossible (unless the rule library itself is empty).
- Per-language packs verified via integration tests in `install-target.test.ts` (one test per language fingerprint).

---

**Relation with other epics:**
- [EPIC-002 — `add_rule` MCP](../../PRD-001-align-with-claude-canon/EPIC-002-add-rule-mcp/EPIC-002-add-rule-mcp.md) — provides the `addRule` core function this epic delegates to.
- [EPIC-010 — Rule audit and ops](../../PRD-008-rule-hygiene/EPIC-010-rule-audit-and-ops/EPIC-010-rule-audit-and-ops.md) — the auto-installed rules feed the audit dashboard on day one.
