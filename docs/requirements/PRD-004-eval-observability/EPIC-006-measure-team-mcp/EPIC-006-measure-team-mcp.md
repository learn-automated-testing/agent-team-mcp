# EPIC-006 — `measure_team` MCP tool

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Source document:** ../PRD-004-eval-observability.md

## Problem statement

Once a team is installed, there is no signal on whether it actually fires. Skills with vague descriptions stay silent and the user does not notice. Refinement is blind without a measurement layer.

## Goal

A developer points `measure_team` at a project plus a transcript (file path or string) or a directory of transcripts, and gets per-skill / per-agent invocation counts, an inferred trigger rate, a list of missed prompts, and proposed description tweaks.

## Scope (v1)

**In scope**
- `measureTeam({projectDir, transcript, window?})` core function.
- Transcript parsing for user messages, `Task` invocations, skill loads, tool uses.
- Keyword-and-phrase matching of user prompts against installed skill descriptions to compute `matched / expected`.
- Aggregate report when `transcript` points at a directory.
- JSON output with per-agent counts, per-skill trigger rate, missed prompts, and tweak suggestions.

**Out of scope**
- Auto-applying suggested description tweaks (user runs `refine_item`).
- Cross-project aggregation (future dashboard PRD).
- Semantic / LLM-based trigger matching.

## Users

- **AI developer** — wants concrete, actionable signal on which skills under-fire.
- **Future dashboard maintainer** — needs structured per-skill output to aggregate.

## User stories

### Must-have
- [US-001 — `measure_team` returns per-agent / per-skill report from a transcript](./US-001-measure-team-tool.md)
- [US-002 — Per-skill inferred trigger rate with missed-prompt list](./US-002-per-skill-trigger-rate.md)

### Should-have
- [US-003 — Aggregate report over a directory of transcripts](./US-003-aggregate-over-directory.md)

## Testing scope

Unit + integration in `src/core/measure.test.ts` — fixture transcripts with known trigger failures assert flag accuracy; aggregate behaviour asserted with multi-transcript fixture directory.

## Decisions (recorded 2026-05-10)

1. Keyword-and-phrase matching is sufficient for v1; no LLM in the loop.
2. Transcript may be a file path or a literal string; both supported.
3. No external service — all analysis local, zero API cost.

## Open questions

1. Where can a Claude Code transcript be exported from deterministically?
2. Minimum viable matching heuristic that still gives useful signal?

## Success metrics

- Flags ≥ 80% of known failures on the curated test set.
- ≥ 50% of users follow up with `refine_item` after running.

---

**Relation with other epics:**
- Adjacent to refinement workflows (`refine_item`) — produces the signal the user acts on.
