# PRD-008 — Rule hygiene + audit dashboard

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/rule-hygiene.md` (migrated to this hierarchy — see git history)

## Problem statement

`.claude/rules/` can grow into a graveyard: unscoped rules all load at session start, duplicates quietly pile up, and rules that target paths no longer in the repo become noise. Anthropic's own guidance warns that longer / more-conflicting instructions reduce adherence. skillsrepo provides `add_rule` but nothing to keep the directory healthy, and no visual way to see the state of an installed team.

## Goal

A developer can audit, merge, and archive rules through dedicated MCP tools, and generate a single-file HTML dashboard that renders the overall health of the installed team.

## Users

- **AI developers** — capturing rules for weeks, want to spot duplicates and stale entries.
- **Team leads** — auditing a project's convention landscape at a glance.

## Capabilities (high level)

- `audit_rules` returns total count, scoped/unscoped split, duplicate candidates, stale rules, oversize flags, and a health rating.
- `merge_rules` concatenates bullets from multiple rule files into one, unioning `paths:` and deleting the sources.
- `archive_rule` moves a rule file under `.claude/rules/archive/` so Claude Code stops auto-loading it.
- `generate_audit_report` writes a single-file HTML dashboard at `.claude/audit-report.html` combining audit, lessons, team inventory, fingerprint, and warnings.

## Non-functional requirements

- **Self-loading safety:** `archive/` is not on Claude Code's auto-load path.
- **Read vs write:** audit is read-only; merge is destructive on sources; archive moves rather than deletes.
- **Self-contained dashboard:** no external fonts, scripts, CDN or network calls.

## Out of scope

- Automatic merging of duplicates (surfaced by audit, merged on explicit call).
- Rule editing via the dashboard (read-only).
- Multi-project dashboard (one project per report).
- Live-reload / watch mode.

## Open questions

- Exact thresholds for "good / warning / cluttered" — v1 uses unscoped ≤5, total ≤20, no file >80 lines.

## Success metrics

- After a week of dogfooding, a user with ≥ 10 rules can run `generate_audit_report` and see at least one actionable item.
- Dashboard renders cleanly in Chrome / Safari / Firefox on first open.

---

## Epics

- [EPIC-010 — Rule audit and ops](./EPIC-010-rule-audit-and-ops/EPIC-010-rule-audit-and-ops.md)
- [EPIC-011 — Audit HTML dashboard](./EPIC-011-audit-html-dashboard/EPIC-011-audit-html-dashboard.md)
