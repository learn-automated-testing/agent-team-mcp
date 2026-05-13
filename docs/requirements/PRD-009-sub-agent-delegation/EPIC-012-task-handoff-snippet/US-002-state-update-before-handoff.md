---
id: US-002
epic: EPIC-012-task-handoff-snippet
priority: must-have
status: done
testing: [integration]
---

# US-002 — Each handoff is preceded by a `state.json` update step

As an **AI developer**, I want **every handoff in an agent's workflow to be preceded by a `state.json` update step in the same section**, so that **the receiving agent has fresh context on the next turn**.

## Context

The handoff snippet ships with a paired state-update step rendered just before the `Task` invocation.

**Existing implementation:** `templates/snippets/handoff.md` plus integration into agent workflow templates.

## Acceptance criteria

- [x] In every installed agent body, the `Task` handoff invocation is preceded by an explicit instruction to update `.claude/state.json`.
- [x] The state-update step names the new `current_step` value the receiving agent should expect.
- [x] The two steps appear in the same workflow section, in order.

## Testing

- **Integration (vitest)**: install fixture asserts the order in each agent body that has a downstream handoff.

## Notes / implementation hints

The state update is part of the snippet itself — agents do not reinvent it per template.
