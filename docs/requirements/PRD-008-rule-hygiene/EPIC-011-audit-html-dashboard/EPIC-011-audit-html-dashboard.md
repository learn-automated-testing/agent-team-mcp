# EPIC-011 — Audit HTML dashboard

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-008-rule-hygiene.md

## Problem statement

Even with `audit_rules`, there was no at-a-glance visualisation of an installed team's overall health. A team lead reviewing a project had no single pane combining rules, lessons, installed team, fingerprint, and warnings.

## Goal

A developer runs `generate_audit_report({projectDir})` and gets a self-contained `.claude/audit-report.html` rendering the rule audit, captured lessons, installed team inventory, stack fingerprint, and health warnings — usable in any modern browser without network access.

## Scope (v1)

**In scope**
- `generateAuditReport({projectDir})` core function and `generate_audit_report` MCP tool.
- Single-file HTML with inline CSS (no CDN, no external scripts, no external fonts).
- Combines `auditRules` output, lessons array, installed agents/skills inventory, stack fingerprint, health warnings.
- Idempotent — safe to re-run.

**Out of scope**
- Rule editing via the dashboard.
- Multi-project dashboard.
- Live-reload / watch mode.

## Users

- **AI developer** — wants a glance-able view of their installed team's state.
- **Team lead** — wants to share a static HTML snapshot in a code review or wiki.

## User stories

### Must-have
- [US-001 — `generate_audit_report` writes self-contained HTML to `.claude/audit-report.html`](./US-001-generate-audit-report-tool.md)

## Testing scope

Integration on the generator: fixture project, assert the produced HTML contains the expected sections, no `<script src="…">` / `<link rel="stylesheet" href="//…">` / web fonts, and is valid enough to render.

## Decisions (recorded 2026-05-10)

1. Self-contained — anyone with the file and a browser can read it.
2. Read-only — no editing widgets in the dashboard.
3. Output path is fixed at `.claude/audit-report.html` to make it discoverable.

## Open questions

None at v1 release.

## Success metrics

- Dashboard renders cleanly in Chrome / Safari / Firefox on first open (no broken layout, no JS errors).

---

**Relation with other epics:**
- [EPIC-010 — Rule audit and ops](../EPIC-010-rule-audit-and-ops/EPIC-010-rule-audit-and-ops.md) — sources the rule data this dashboard renders.
- [EPIC-009 — `capture_lesson`](../EPIC-009-capture-lesson-mcp/EPIC-009-capture-lesson-mcp.md) — sources the lessons section.
