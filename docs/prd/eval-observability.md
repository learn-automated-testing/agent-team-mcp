# PRD: eval and observability

## Problem statement
There is no feedback mechanism to tell whether an installed team actually works. Anthropic's
own skill-building guide calls out "skills that never trigger" as the number-one failure
mode. Right now users install a team and hope — no data on trigger rates, completion rates,
or where human correction is happening. Refinement is blind: you only `refine_item` when
you happen to notice something is off.

## Goal
Add tooling that measures whether agents and skills are being used as intended, by
analysing Claude Code transcripts or runtime signals, and returning an actionable report
the user can act on (usually via `refine_item`).

## Users
- AI developers tuning their installed teams based on real usage
- Future: dashboard maintainers aggregating signals across projects

## User stories
- **must-have** As an AI developer, I can run `measure_team({projectDir, transcript})` and see which agents/skills fired versus which were expected to fire for a given user message.
- **must-have** As an AI developer, I get a per-skill summary: "`test` skill matched 3/10 user prompts where it should have — description may need tuning."
- **must-have** As an AI developer, I get specific suggestions: "prompt 'can you add a test for this' didn't trigger `test` — consider adding the phrase to the description."
- **should-have** As an AI developer, I can point the tool at a directory of transcripts and get an aggregate report across sessions.

## Functional requirements
1. New MCP tool `measure_team({projectDir, transcript, window?})`.
   - `transcript` is either a file path (JSON transcript export or raw text) or literal string contents.
2. Parse transcript for: user messages, `Task` invocations (→ which sub-agents were spawned), skill loads (if detectable), tool uses.
3. For each user message, match against installed skill descriptions using a simple keyword-plus-phrase match against the description's trigger phrases. Flag when a user prompt "should have" loaded a skill that did not load.
4. Output a JSON report with:
   - Per-agent invocation count
   - Per-skill inferred trigger rate (`matched / expected`)
   - List of specific user prompts that missed
   - Proposed description tweaks for under-triggering skills
5. No external service — all analysis local.

## Non-functional requirements
- Works on exported Claude Code transcripts in whatever JSON shape the export uses.
- Works on raw plaintext as a fallback.
- Zero-cost to run (no API calls).

## Out of scope
- Automatic application of suggested refinements (user runs `refine_item` based on the report)
- Cross-project aggregation (that belongs to the dashboard PRD)
- Semantic/LLM-based matching for trigger detection — keyword-and-phrase matching is sufficient for v1 and matches Anthropic's guidance

## Open questions
- Where can a Claude Code transcript be exported from? Is there a deterministic path or format, or does the user have to paste?
- What is the minimum viable matching heuristic that still gives useful signal?

## Success metrics
- On a curated test set of transcripts with known trigger failures, the tool correctly flags ≥ 80% of the failures.
- After running the tool, user follows up with `refine_item` (or equivalent action) in ≥ 50% of cases — i.e. the output is actionable enough to motivate a fix.
