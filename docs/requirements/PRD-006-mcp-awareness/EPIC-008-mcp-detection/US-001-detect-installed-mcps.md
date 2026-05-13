---
id: US-001
epic: EPIC-008-mcp-detection
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `inspect_project` detects installed MCPs

As an **AI developer**, I want **`inspect_project` to return the list of MCP server names configured in `~/.claude.json` and `.mcp.json`**, so that **the recommender and installed agents know what tools I have available**.

## Context

`inspectProject` reads `~/.claude.json` (user-level) and project-local `.mcp.json` if present, parses the configured stdio / HTTP server names, and exposes them on the fingerprint as `installedMcps: string[]`.

**Existing implementation:** parser in `src/core/inspect.ts` (or adjacent); `Fingerprint.installedMcps` field in `src/core/types.ts`.

## Acceptance criteria

- [x] Calling `inspect_project({projectDir})` on a project with MCPs configured returns a non-empty `installedMcps` array.
- [x] When neither `~/.claude.json` nor `.mcp.json` exists, `installedMcps` is `[]` (no error).
- [x] Only server names are returned — never credentials or env vars.
- [x] Tool makes no network calls.

## Testing

- **Unit (vitest)**: parser exercises fixture `~/.claude.json` shapes.
- **Integration (vitest)**: `inspect_project` smoke asserts the field appears with expected names.

## Notes / implementation hints

Parser tolerates missing keys — empty list is the safe fallback.
