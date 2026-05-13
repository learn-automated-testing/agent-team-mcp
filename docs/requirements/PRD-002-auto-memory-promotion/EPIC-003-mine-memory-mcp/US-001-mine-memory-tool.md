---
id: US-001
epic: EPIC-003-mine-memory-mcp
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — `mine_memory` returns deduped candidates with metadata

As an **AI developer**, I want **to call `mine_memory({projectDir})` and get a list of auto-memory entries that aren't already team-captured**, so that **I can review what Claude has learned personally and decide what to promote**.

## Context

Auto-memory lives at `~/.claude/projects/<encodedProjectPath>/memory/`. `mineMemory` reads `MEMORY.md` plus sibling `*.md` files, parses bullet items as candidates, dedupes against `.claude/rules/`, `.claude/.skillsrepo.json` lessons, and `## Learned conventions` in `.claude/context.md`, and enriches each surviving entry with a suggested `target` / `paths` / `category`.

**Existing implementation:** `src/core/memory-mine.ts`; MCP wrapper `mine_memory`.

## Acceptance criteria

- [x] Returns `{ memoryDir, candidates, total, alreadyCaptured }`.
- [x] Each candidate carries `text`, suggested `target` (`"rule"` or `"lesson"`), and (for rules) inferred `paths`.
- [x] Candidates that match (case-insensitive, trimmed) any rule bullet, lesson entry, or context.md learned-convention bullet are excluded from `candidates` and counted in `alreadyCaptured`.
- [x] When the auto-memory directory does not exist, the call returns `total: 0` rather than erroring.
- [x] Tool is read-only: no files under `~/.claude/projects/...` are modified.

## Testing

- **Unit (vitest)**: `src/core/memory-mine.test.ts` covers parsing, dedup, target/paths inference.
- **Integration (vitest)**: fixture project + fixture memory dir round-trips through the MCP tool.

## Notes / implementation hints

Default memory dir uses `absProjectPath.replace(/\//g, "-")` to match Anthropic's on-disk encoding.
