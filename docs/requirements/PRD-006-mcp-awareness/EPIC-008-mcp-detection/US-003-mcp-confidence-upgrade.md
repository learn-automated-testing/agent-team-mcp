---
id: US-003
epic: EPIC-008-mcp-detection
priority: should-have
status: done
testing: [unit]
---

# US-003 — Recommender upgrades confidence on MCP-related agents

As an **AI developer with `selenium-mcp` configured**, I want **`recommend_setup` to upgrade `qa` confidence from `medium` to `high`**, so that **the recommender favours roles whose work is naturally enabled by my MCPs**.

## Context

`recommendSetup` consults a table-driven mapping from MCP name to candidate confidence upgrade. When the fingerprint's `installedMcps` matches the table, the related agent's confidence is bumped.

**Existing implementation:** mapping table in `src/core/recommend.ts`.

## Acceptance criteria

- [x] When `installedMcps` includes `selenium-mcp`, the `qa` agent in `recommend_setup` output has `confidence: "high"` (assuming baseline was `medium`).
- [x] When the relevant MCP is not present, baseline confidence is preserved.
- [x] Upgrades are table-driven — adding a new mapping does not require touching unrelated logic.

## Testing

- **Unit (vitest)**: recommender unit tests assert the upgrade with and without the MCP present.

## Notes / implementation hints

Baseline confidences come from the existing recommender heuristics — MCP presence only upgrades, never downgrades.
