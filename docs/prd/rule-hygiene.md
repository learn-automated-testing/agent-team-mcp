# PRD: rule hygiene + audit dashboard

## Problem statement
`.claude/rules/` can grow into a graveyard: unscoped rules all load at session start, duplicates quietly pile up, and rules that target paths no longer in the repo become noise. Anthropic's own guidance warns that longer/more-conflicting instructions reduce adherence. skillsrepo provides `add_rule` but nothing to keep the directory healthy, and no visual way to see the state of the installed team.

## Goal
Add hygiene tooling — audit, merge, archive — plus a single-file HTML dashboard that renders the overall health of an installed skillsrepo team.

## Users
- AI developers who've been capturing rules for weeks and want to spot duplicates and stale entries
- Team leads auditing a project's convention landscape at a glance

## User stories
- **must-have** `audit_rules({projectDir})` returns: total count, scoped/unscoped split, duplicate candidates (normalised-bullet overlap), stale rules (globs matching no file in repo), oversize flags (>80 lines per file), plus a health rating.
- **must-have** `merge_rules({projectDir, into, from[], paths?})` reads multiple rule files, concatenates their bullets into the `into` file with a union of `paths:` (or explicit `paths` arg), deletes the sources.
- **must-have** `archive_rule({projectDir, name})` moves `.claude/rules/<name>.md` to `.claude/rules/archive/<name>.md` so Claude Code stops auto-loading it.
- **must-have** `generate_audit_report({projectDir})` writes a single-file HTML dashboard to `.claude/audit-report.html` combining the rule audit, lessons, installed team, stack fingerprint, and health warnings. Idempotent — safe to re-run.

## Functional requirements
1. New `src/core/audit.ts`:
   - `auditRules({projectDir})` returns `{ total, scoped, unscoped, duplicates, stale, oversize, health }` where health is `"good" | "warning" | "cluttered"` based on thresholds (unscoped ≤5, total ≤20, no file >80 lines, no duplicates → good).
   - Duplicate detection: normalise bullets (trim+lowercase+collapse-whitespace), flag any bullet appearing in ≥2 files.
   - Stale detection: for each rule's `paths:`, glob-walk the project; if zero matches, mark stale.
2. New `src/core/rule-ops.ts`:
   - `mergeRules({projectDir, into, from, paths?, title?})` — reads sources, concatenates bullets, writes merged file, deletes sources. Errors if sources don't exist or target already exists without `overwrite`.
   - `archiveRule({projectDir, name})` — moves `<name>.md` to `archive/<name>.md`. Errors if source missing.
3. New `src/core/audit-report.ts`:
   - `generateAuditReport({projectDir})` computes rules audit + lessons + team inventory + fingerprint, writes single-file HTML to `.claude/audit-report.html`. Self-contained (no CDN/JS).
4. Four MCP tools: `audit_rules`, `merge_rules`, `archive_rule`, `generate_audit_report`.

## Non-functional
- Archive folder is itself not auto-loaded by Claude Code (`.claude/rules/archive/` is not the path Claude scans).
- Audit is read-only; merge/archive are destructive to source files but move-not-delete for archive.
- HTML dashboard is self-contained — no external fonts, scripts, or network calls. Anyone with the file and a browser can read it.

## Out of scope
- Automatic merging of duplicates (surfaced by audit, merged by user on explicit call)
- Rule editing via dashboard (dashboard is read-only)
- Multi-project dashboard (one project per report)
- Live-reload / watch mode

## Open questions
- Exact thresholds for "good/warning/cluttered" — v1 uses unscoped ≤5, total ≤20, no file >80 lines. Can be tuned after dogfooding.

## Success metrics
- After a week of dogfooding, a user with ≥10 rules can run `generate_audit_report` and see at least one actionable item (duplicate or stale).
- Dashboard renders cleanly in Chrome/Safari/Firefox on first open (no broken layout, no JS errors).
