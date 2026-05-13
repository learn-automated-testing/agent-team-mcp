---
id: US-001
epic: EPIC-011-audit-html-dashboard
priority: must-have
status: done
testing: [integration]
---

# US-001 — `generate_audit_report` writes self-contained HTML to `.claude/audit-report.html`

As an **AI developer or team lead**, I want **to call `generate_audit_report({projectDir})` and get a single-file HTML dashboard**, so that **I can glance at the team's overall health and share a static snapshot in any review**.

## Context

`generateAuditReport` composes `auditRules` output, `lessons[]`, the installed team inventory, the stack fingerprint, and health warnings into a self-contained HTML file at `.claude/audit-report.html`.

**Existing implementation:** `src/core/audit-report.ts`; MCP wrapper `generate_audit_report`.

## Acceptance criteria

- [x] After the call, `.claude/audit-report.html` exists.
- [x] The file contains sections for rules audit, lessons, installed team, stack fingerprint, and warnings.
- [x] The file contains no `<script src="…">` referencing an external URL.
- [x] The file contains no `<link rel="stylesheet" href="…">` referencing an external URL.
- [x] The file contains no `@import url("…")` referencing an external URL.
- [x] The file is idempotent — re-running rewrites the same content for the same inputs.

## Testing

- **Integration (vitest)**: fixture project; assert the produced HTML contains expected section headers and no external resource references.

## Notes / implementation hints

Inline CSS only; no fonts via `<link>`. Anyone with the file and a browser can read it.
