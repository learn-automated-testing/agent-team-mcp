---
id: US-001
epic: EPIC-005-copilot-rendering-and-warnings
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — Copilot standalone bodies rewrite four `.claude/...` prefixes

As an **AI developer in copilot-standalone mode**, I want **internal cross-references in agent/skill bodies to land under `.github/...`**, so that **Copilot can navigate them without breaking**.

## Context

`rewriteClaudePaths` applies a closed `PATH_REWRITES` table. Standalone agents also strip `isolation:` frontmatter via `rewriteAgentForCopilot`. Critically, `.claude/state.json` and `.claude/.skillsrepo.json` are **not** rewritten.

**Existing implementation:** `src/core/copilot-render.ts`.

## Acceptance criteria

- [x] In every file under `.github/agents/` and `.github/skills/` produced by a `copilot`-standalone install, no literal `.claude/skills/` appears.
- [x] No literal `.claude/agents/` appears.
- [x] No literal `.claude/rules/` appears.
- [x] No literal `.claude/context.md` appears.
- [x] References to `.claude/state.json` and `.claude/.skillsrepo.json` are preserved verbatim.
- [x] Standalone agent bodies have no `isolation:` frontmatter line.

## Testing

- **Unit (vitest)**: `rewriteClaudePaths` unit test asserts each prefix mapping.
- **Integration (vitest)**: `src/core/install-target.test.ts` `rewriteClaudePaths` contract test.

## Notes / implementation hints

`PATH_REWRITES` is a closed set — adding a prefix requires an ADR.
