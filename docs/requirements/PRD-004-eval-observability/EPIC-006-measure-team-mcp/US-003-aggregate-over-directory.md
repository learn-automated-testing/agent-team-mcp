---
id: US-003
epic: EPIC-006-measure-team-mcp
priority: should-have
status: done
testing: [integration]
---

# US-003 — Aggregate report over a directory of transcripts

As an **AI developer**, I want **to point `measure_team` at a directory of transcripts and get an aggregate report**, so that **I can see signal across many sessions, not just one**.

## Context

When `transcript` resolves to a directory, the tool walks the directory, parses each contained transcript, and merges per-agent / per-skill counts.

**Existing implementation:** directory branch in `src/core/measure.ts`.

## Acceptance criteria

- [x] When `transcript` is a directory path, all readable transcript files inside are aggregated.
- [x] Per-agent invocation counts in the aggregate are the sum across files.
- [x] Per-skill `matched` / `expected` in the aggregate are the sum across files.
- [x] Files that fail to parse are skipped without aborting the run; their failure is reported.

## Testing

- **Integration (vitest)**: `src/core/measure.test.ts` with a fixture directory of multiple transcripts.

## Notes / implementation hints

`window?` parameter (if supplied) bounds the time-range considered for aggregation.
