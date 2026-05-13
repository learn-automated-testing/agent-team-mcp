---
id: US-002
epic: EPIC-008-mcp-detection
priority: must-have
status: done
testing: [unit]
---

# US-002 — Stack section includes `- Available MCPs: …` when non-empty

As an **AI developer with MCPs configured**, I want **the "Detected stack" section of every installed agent and skill to include an `- Available MCPs: …` line**, so that **agents reference the MCPs they actually have**.

## Context

`stackSection()` renders the Detected stack block from the fingerprint. When `installedMcps` is non-empty, an extra line is added.

**Existing implementation:** `stackSection` in `src/core/templates.ts`.

## Acceptance criteria

- [x] When `fingerprint.installedMcps` is non-empty, the rendered stack section contains an `- Available MCPs: …` line listing the names.
- [x] When `installedMcps` is empty, the line is not rendered.
- [x] The line is rendered identically across agent and skill stack sections.

## Testing

- **Unit (vitest)**: `stackSection` unit tests assert presence / absence of the line.

## Notes / implementation hints

Names render comma-separated and code-fenced for readability.
