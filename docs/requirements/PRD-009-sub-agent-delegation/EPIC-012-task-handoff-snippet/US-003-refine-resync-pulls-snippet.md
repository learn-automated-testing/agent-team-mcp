---
id: US-003
epic: EPIC-012-task-handoff-snippet
priority: must-have
status: done
testing: [integration]
---

# US-003 — `refine_item({resyncBody: true})` pulls the snippet into existing installs

As an **AI developer with a previous skillsrepo install**, I want **`refine_item({resyncBody: true})` to pull the updated handoff snippet into my existing agent files**, so that **I don't need to reinstall from scratch to get the new handoff behaviour**.

## Context

`refine_item` already supports body resync. With the snippet shared, a resync re-renders the snippet into the agent body using the latest template.

**Existing implementation:** `refineItem` in `src/core/refine.ts`.

## Acceptance criteria

- [x] After `refine_item({projectDir, kind: "agent", name: "<name>", resyncBody: true})`, the agent body contains the latest handoff snippet.
- [x] User-edited content outside the snippet's region is preserved.
- [x] When the agent has no downstream handoff, the snippet is not injected.
- [x] When the snippet is already up-to-date, the call is a no-op (no spurious diff).

## Testing

- **Integration (vitest)**: `src/core/refine.test.ts` asserts `resyncBody: true` produces an updated agent body containing the handoff snippet.

## Notes / implementation hints

This is the migration path for installs created before EPIC-012 shipped.
