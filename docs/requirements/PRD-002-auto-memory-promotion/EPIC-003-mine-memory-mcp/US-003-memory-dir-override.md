---
id: US-003
epic: EPIC-003-mine-memory-mcp
priority: should-have
status: done
testing: [unit]
---

# US-003 — `memoryDir` override on `mine_memory`

As an **AI developer or test author**, I want **to pass an explicit `memoryDir` to `mine_memory`**, so that **I can mine memory from a non-default location (or a fixture directory)**.

## Context

The default memory dir is derived from the project path via the Claude Code encoding convention. For testing and for users with custom Claude Code setups, an explicit override is necessary.

**Existing implementation:** `memoryDir` parameter in `mineMemory` (`src/core/memory-mine.ts`).

## Acceptance criteria

- [x] When `memoryDir` is provided, `mine_memory` reads from that path instead of computing the default.
- [x] When the override path does not exist, the call returns `total: 0` (same fallback as the default-path case).
- [x] The returned `memoryDir` field on the response matches the path actually read.

## Testing

- **Unit (vitest)**: `src/core/memory-mine.test.ts` exercises the override with a fixture directory.

## Notes / implementation hints

The override is also the easiest path to test the dedup logic without touching real auto-memory.
