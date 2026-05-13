---
id: US-002
epic: EPIC-006-measure-team-mcp
priority: must-have
status: done
testing: [unit]
---

# US-002 — Per-skill inferred trigger rate with missed-prompt list

As an **AI developer**, I want **the report to give me each skill's `matched / expected` trigger rate plus the specific user prompts that should have triggered the skill but did not**, so that **I have an actionable signal — not just a number — to drive `refine_item`**.

## Context

For each user message, `measure_team` matches against installed skill descriptions using keyword-and-phrase matching. When a prompt should have loaded a skill that did not, it is flagged as a miss. The report includes proposed description tweaks per under-triggering skill.

**Existing implementation:** matcher in `src/core/measure.ts`.

## Acceptance criteria

- [x] Each per-skill entry includes `matched`, `expected`, and `triggerRate`.
- [x] Each per-skill entry includes a `missedPrompts: string[]` of user prompts that should have triggered but did not.
- [x] For under-triggering skills (rate below a threshold), the report includes a `proposedTweak` string.

## Testing

- **Unit (vitest)**: `src/core/measure.test.ts` asserts ≥ 80% flag accuracy on the curated test set.

## Notes / implementation hints

Keyword-and-phrase matching against the description's trigger phrases is the v1 heuristic — no LLM in the loop.
