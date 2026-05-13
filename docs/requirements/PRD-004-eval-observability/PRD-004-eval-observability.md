# PRD-004 — Eval and observability

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/eval-observability.md` (migrated to this hierarchy — see git history)

## Problem statement

There is no feedback mechanism to tell whether an installed team actually works. Anthropic's own skill-building guide calls out "skills that never trigger" as the number-one failure mode. Right now users install a team and hope — no data on trigger rates, completion rates, or where human correction is happening. Refinement is blind: you only `refine_item` when you happen to notice something is off.

## Goal

A developer can run a measurement tool against a Claude Code transcript (or a directory of transcripts) and get an actionable per-skill report on trigger rates, missed prompts, and proposed description tweaks.

## Users

- **AI developers** — tuning installed teams based on real usage signals.
- **Future dashboard maintainers** — aggregating signals across projects.

## Capabilities (high level)

- `measure_team` MCP tool that takes a project directory and a transcript (file path or string) and returns a per-skill / per-agent usage report.
- Per-skill inferred trigger rate (`matched / expected`) with a list of user prompts that should have triggered the skill but did not.
- Aggregate report when pointed at a directory of transcripts.
- Proposed description tweaks for under-triggering skills.

## Non-functional requirements

- **Format tolerance:** works on Claude Code's exported JSON transcripts and on raw plaintext as a fallback.
- **Cost:** zero — no external API calls, all analysis local.
- **Privacy:** transcript content stays on the user's machine.

## Out of scope

- Automatic application of suggested refinements (the user runs `refine_item` based on the report).
- Cross-project aggregation (belongs to a future dashboard PRD).
- Semantic / LLM-based matching for trigger detection — keyword-and-phrase matching is sufficient for v1.

## Open questions

- Where can a Claude Code transcript be exported from? Is there a deterministic path or format, or does the user paste?
- What is the minimum viable matching heuristic that still gives useful signal?

## Success metrics

- On a curated test set of transcripts with known trigger failures, the tool flags ≥ 80% of failures.
- After running the tool, users follow up with `refine_item` (or equivalent) in ≥ 50% of cases.

---

## Epics

- [EPIC-006 — `measure_team` MCP tool](./EPIC-006-measure-team-mcp/EPIC-006-measure-team-mcp.md)
