---
id: US-003
epic: EPIC-005-copilot-rendering-and-warnings
priority: must-have
status: done
testing: [integration]
---

# US-003 — Skip-warnings appear on `report.warnings`

As an **AI developer rerunning install with `overwrite=false`**, I want **a `report.warnings` list of files the plan would have written but skipped**, so that **I can spot stale-but-skipped content without diffing manually**.

## Context

Distinct from `report.skipped` (every skip including idempotent no-ops), `report.warnings` is the actionable subset — files the user probably needs to re-install with `overwrite=true`.

**Existing implementation:** `installSetup` in `src/core/install.ts`.

## Acceptance criteria

- [x] When `installSetup` runs with `overwrite=false` and skips a file the current plan would have written differently, `report.warnings` includes `{ kind, name, path, reason: "stale-file" }`.
- [x] When the user has hand-edited a file the plan would have rewritten, `report.warnings` includes an entry with `reason: "user-edited"`.
- [x] When nothing is stale or user-edited, `report.warnings` is empty.
- [x] The MCP `install_setup` tool response payload includes `warnings` so both Claude Code and Copilot can render them.
- [x] Payload shape is identical across engines — no engine-specific rendering branch in the installer.

## Testing

- **Integration (vitest)**: `install-target.test.ts` and adjacent install tests assert warnings populate when expected and stay empty otherwise.

## Notes / implementation hints

`report.warnings` empty is the canary — empty means the on-disk tree matches the plan.
