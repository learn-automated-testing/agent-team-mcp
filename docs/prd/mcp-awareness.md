# PRD: MCP-awareness in the recommender

## Problem statement
`inspect_project` only reads the codebase. It ignores the user's available MCP servers
(Selenium, filesystem, Gmail, Google Calendar, etc.), which means the installed agents
don't know what tools they actually have access to. A `qa` agent that could drive a
browser via the Selenium MCP is handed the same generic template as a `qa` agent with no
browser access.

## Goal
Detect the user's configured MCP servers and surface them in the fingerprint. Agents'
"Detected stack" section then references available MCPs, and (in a follow-up) the
recommender can swap agent variants when specific MCPs are present.

## Users
- AI developers whose Claude Code has multiple MCP servers configured
- Teams standardising on a set of MCPs and wanting skillsrepo to lean on them

## User stories
- **must-have** As an AI developer with `selenium-mcp` configured, my installed `qa` agent sees `selenium-mcp` in its stack section, so it knows browser automation is an option.
- **must-have** As an AI developer, I can run `inspect_project` and see which MCPs were detected in the fingerprint output.
- **should-have** As an AI developer, when a specific MCP is present, the recommender upgrades confidence on related agents (e.g. presence of `selenium-mcp` raises `qa` confidence from `medium` to `high`).

## Functional requirements
1. Extend `inspectProject()` to read user-level MCP config from `~/.claude.json` and project-local `.mcp.json` if present. Parse the list of configured stdio/HTTP servers.
2. Add `installedMcps: string[]` to the `Fingerprint` type; populate with server names (not configs).
3. Extend `stackSection()` to include `- Available MCPs: …` when the list is non-empty.
4. Extend `recommendSetup()` to optionally upgrade confidence on agents when specific MCPs are detected (table-driven; simple mapping).
5. Fail gracefully: if the claude.json path is non-standard or unreadable, return empty list — no error.

## Non-functional requirements
- Never emit MCP credentials or env vars — only server names.
- Respect OS differences: look in `~/.claude.json` on macOS/Linux, standard locations on Windows if applicable.
- Zero network I/O — read local config only.

## Out of scope
- Installing MCP servers on the user's behalf
- Auth flow for detected MCPs
- Inferring MCP *capabilities* (what tools each exposes) — only names for v1
- Swapping entire template bodies based on MCP — only stack-section references and confidence tweaks

## Open questions
- Exact parse shape of `~/.claude.json` — does it list servers under a stable key across versions?
- Do we include disabled / authentication-pending MCPs, or only connected ones?
- Should the user be able to override the detected MCP list at install time?

## Success metrics
- Detects 100% of the user's configured stdio MCPs on macOS in dogfooding.
- At least one agent references at least one detected MCP in the stack section on a real machine.
