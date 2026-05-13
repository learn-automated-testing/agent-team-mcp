---
id: US-001
epic: EPIC-006-measure-team-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `measure_team` returns per-agent / per-skill report from a transcript

As an **AI developer**, I want **to call `measure_team({projectDir, transcript})` and get a JSON report of which agents and skills fired**, so that **I can see whether my installed team is actually being used as intended**.

## Context

The transcript may be a file path (JSON export or raw text) or a literal string. The tool parses user messages, `Task` invocations, skill loads, and tool uses, then returns per-agent invocation counts and per-skill firing data.

**Existing implementation:** `src/core/measure.ts`; MCP wrapper `measure_team`.

## Acceptance criteria

- [x] Calling with a transcript file path returns the parsed report.
- [x] Calling with a literal transcript string returns the same structure.
- [x] Report includes per-agent invocation counts.
- [x] Report includes per-skill firing data (loaded vs not loaded).
- [x] Tool makes no network calls.

## Testing

- **Unit (vitest)**: `src/core/measure.test.ts` covers the parser on fixture transcripts.
- **Integration (vitest)**: MCP tool wrapper round-trips a transcript fixture.

## Notes / implementation hints

Tolerate both Claude Code's JSON export shape and raw plaintext as a fallback.
