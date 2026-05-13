# PRD-006 — MCP-awareness in the recommender

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/mcp-awareness.md` (migrated to this hierarchy — see git history)

## Problem statement

`inspect_project` only reads the codebase. It ignores the user's available MCP servers (Selenium, filesystem, Gmail, Google Calendar, etc.), which means the installed agents do not know what tools they actually have access to. A `qa` agent that could drive a browser via the Selenium MCP is handed the same generic template as a `qa` agent with no browser access.

## Goal

`inspect_project` detects the user's configured MCP servers and surfaces them on the fingerprint; agents' "Detected stack" section references them, and the recommender can upgrade confidence on agents whose work is naturally enabled by a present MCP.

## Users

- **AI developers** — want their installed agents to lean on the MCPs they already have configured.
- **Teams standardising on MCPs** — want skillsrepo to detect and reference them automatically.

## Capabilities (high level)

- `inspect_project` reads user-level MCP config from `~/.claude.json` and project-local `.mcp.json` and exposes a list of server names on the fingerprint.
- The "Detected stack" section in installed agents and skills includes `- Available MCPs: …` when non-empty.
- `recommend_setup` upgrades confidence on related agents when specific MCPs are detected (e.g. `selenium-mcp` raises `qa` from `medium` to `high`).
- Graceful fallback when the config path is non-standard or unreadable: empty list, no error.

## Non-functional requirements

- **Privacy:** never emit MCP credentials or env vars — only server names.
- **Cross-platform:** look in standard locations on macOS/Linux/Windows.
- **No network I/O:** read local config only.

## Out of scope

- Installing MCP servers on the user's behalf.
- Auth flow for detected MCPs.
- Inferring MCP capabilities (the tools each exposes) — only names for v1.
- Swapping entire template bodies based on MCP — only stack-section references and confidence tweaks.

## Open questions

- Exact parse shape of `~/.claude.json` across versions.
- Include disabled / authentication-pending MCPs, or only connected ones?
- Should the user be able to override the detected MCP list at install time?

## Success metrics

- Detects 100% of the user's configured stdio MCPs on macOS in dogfooding.
- At least one agent references at least one detected MCP in its stack section on a real machine.

---

## Epics

- [EPIC-008 — MCP detection](./EPIC-008-mcp-detection/EPIC-008-mcp-detection.md)
