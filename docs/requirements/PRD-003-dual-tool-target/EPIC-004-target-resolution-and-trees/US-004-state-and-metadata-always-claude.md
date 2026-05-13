---
id: US-004
epic: EPIC-004-target-resolution-and-trees
priority: must-have
status: done
testing: [integration]
---

# US-004 — `.claude/state.json` and `.claude/.skillsrepo.json` always under `.claude/`

As an **AI developer**, I want **MCP-internal state to live at the same path regardless of `target_tooling`**, so that **workflow state, install metadata, and `refine_item` / `audit_rules` work uniformly across Claude Code, Copilot-bridge, and Copilot-standalone installs**.

## Context

`.claude/state.json` (live workflow state) and `.claude/.skillsrepo.json` (install metadata) are MCP-internal files, not user-facing customisation. They land under `.claude/` for every target. Copilot reads and writes them through ordinary file-editing tools.

**Existing implementation:** `installSetup` in `src/core/install.ts`.

## Acceptance criteria

- [x] After any install (`claude`, `copilot`, or `both`), `.claude/.skillsrepo.json` exists with a fresh `updatedAt`.
- [x] After any install, `.claude/state.json` exists; if it was already present, its workflow content is preserved.
- [x] No `.github/state.json` or `.github/.skillsrepo.json` is created in any target.
- [x] `report.written` lists these files under stable `kind` strings (`state`, `metadata`).

## Testing

- **Integration (vitest)**: `src/core/install-target.test.ts` MCP-internal state test (one of the six contract tests).

## Notes / implementation hints

Preserving `state.json` across re-installs is intentional — workflow progress should not be wiped by a re-install.
