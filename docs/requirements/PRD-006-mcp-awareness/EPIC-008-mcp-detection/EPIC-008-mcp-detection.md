# EPIC-008 — MCP detection

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-006-mcp-awareness.md

## Problem statement

`inspect_project` only read the codebase. Configured MCP servers (Selenium, Gmail, Calendar, etc.) were invisible to the recommender and to installed agents — so a `qa` agent with browser-automation MCP available was indistinguishable from one without.

## Goal

`inspect_project` reads `~/.claude.json` and project-local `.mcp.json`, populates `installedMcps: string[]` on the fingerprint, includes them in the rendered "Detected stack" section, and the recommender upgrades confidence on MCP-related agents (e.g. `selenium-mcp` → raise `qa` confidence).

## Scope (v1)

**In scope**
- Read user-level config from `~/.claude.json` and project-local `.mcp.json`.
- Add `installedMcps: string[]` to `Fingerprint`.
- Include `- Available MCPs: …` line in the stack section when non-empty.
- Table-driven confidence upgrades in `recommendSetup` based on detected MCPs.
- Graceful empty-list fallback when config path is non-standard or unreadable.

**Out of scope**
- Installing MCP servers.
- Auth flow for MCPs.
- Inferring MCP capabilities (just names).
- Swapping entire template bodies based on detected MCPs.

## Users

- **AI developer** — gets agents that reference the MCPs they actually have configured.
- **Engineering team** — wants the recommender to favour roles their MCP standardisation enables.

## User stories

### Must-have
- [US-001 — `inspect_project` detects installed MCPs](./US-001-detect-installed-mcps.md)
- [US-002 — Stack section includes `- Available MCPs: …` when non-empty](./US-002-stack-section-includes-mcps.md)

### Should-have
- [US-003 — Recommender upgrades confidence on MCP-related agents](./US-003-mcp-confidence-upgrade.md)

## Testing scope

Unit on the parser (fixture `~/.claude.json` shapes); integration on `inspectProject` and `recommendSetup` output through their respective tests.

## Decisions (recorded 2026-05-10)

1. Never emit MCP credentials or env vars — only server names.
2. No network I/O — local config only.
3. Empty list is the safe fallback; never throw on missing / unreadable config.

## Open questions

1. Exact parse shape of `~/.claude.json` across Claude Code versions.
2. Include disabled / auth-pending MCPs, or only connected?
3. Allow user override at install time?

## Success metrics

- Detects 100% of configured stdio MCPs on macOS in dogfooding.
- ≥ 1 agent references ≥ 1 detected MCP in its stack section on a real machine.

---

**Relation with other epics:**
- [EPIC-001 — Claude canon layout](../EPIC-001-claude-canon-layout/EPIC-001-claude-canon-layout.md) — the stack section that hosts the `- Available MCPs: …` line is rendered as part of the canonical layout.
