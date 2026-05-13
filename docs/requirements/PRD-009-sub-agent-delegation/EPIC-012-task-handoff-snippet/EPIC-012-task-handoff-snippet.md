# EPIC-012 — Task handoff snippet

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-009-sub-agent-delegation.md

## Problem statement

Agent templates described handoffs in prose. Claude Code's `Task(subagent_type=…)` mechanism existed but was not wired into any agent's workflow. Sessions stalled whenever the user had to manually prompt the next role.

## Goal

Every installed agent's "Your workflow" section contains an explicit `Task(subagent_type=<target>)` step preceded by a `state.json` update, and `refine_item({resyncBody: true})` pulls the snippet into existing installations.

## Scope (v1)

**In scope**
- Shared `templates/snippets/handoff.md` parameterised by target role.
- Each agent template includes the snippet at the appropriate workflow step.
- Each handoff is preceded by a state.json update step in the same section.
- `refine_item({resyncBody: true})` pulls in the updated handoff snippet for existing installs.

**Out of scope**
- Handoff to external tools (GitHub, Slack, email).
- Sub-agent failure recovery.
- User-configurable handoff targets per install.

## Users

- **AI developer** — wants lifecycle transitions to fire without saying "now invoke qa".
- **Main Claude thread** — needs an explicit `Task` directive instead of prose.

## User stories

### Must-have
- [US-001 — Shared handoff snippet renders into agent workflow sections](./US-001-handoff-snippet.md)
- [US-002 — Each handoff is preceded by a state.json update step](./US-002-state-update-before-handoff.md)
- [US-003 — `refine_item({resyncBody: true})` pulls the snippet into existing installs](./US-003-refine-resync-pulls-snippet.md)

## Testing scope

Unit on the snippet renderer; integration in `src/core/refine.test.ts` asserts `resyncBody: true` produces an updated agent body containing the handoff snippet.

## Decisions (recorded 2026-05-10)

1. Default sync (wait for sub-agent reply) — fire-and-forget reserved for later.
2. Backward compatible — existing installs only pick up the snippet on `refine_item` / `install_setup --overwrite`.

## Open questions

1. Does `Task` work from inside a sub-agent context, or only from the main thread?

## Success metrics

- ≥ 90% of dogfooded feature lifecycles run end-to-end without manual role prompts.
- Zero stalls where `state.json` is handoff-ready but no agent picks up.

---

**Relation with other epics:**
- [EPIC-004 — Target resolution and trees](../EPIC-004-target-resolution-and-trees/EPIC-004-target-resolution-and-trees.md) — agent templates are rendered by the tree writers; this epic's snippet ships through them.
