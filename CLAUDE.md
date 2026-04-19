# skillsrepo-mcp

This repo has a skillsrepo-managed team installed. Sub-agents live in `.claude/agents/`,
skills in `.claude/skills/`, path-scoped rules in `.claude/rules/`.

## Project

- **Primary language:** typescript
- **Frameworks:** mcp
- **Test framework:** vitest
- **Deploy target:** none-yet
- **Primary user:** AI developers
- **Domain:** MCP for scaffolding skills, agents, and prompts

Full detail — stack, conventions, domain knowledge, learned lessons — is in:

@.claude/context.md

## Core conventions

- Check `.claude/rules/*.md` for path-scoped rules before editing source files.
- Update `.claude/state.json` when entering or completing a workflow step.
- Delegate specialised work to a sub-agent via the `Task` tool rather than doing it inline.
- Read the relevant skill (`.claude/skills/<name>/SKILL.md`) before using its capability.
- Never commit secrets, `.env` files, or API keys.
- Never deploy with failing tests or an unclean git state.

## Orchestration

When a task decomposes into independent sub-tasks, **delegate in parallel** —
one turn with multiple `Task` tool calls, not one call per turn. Sequential
delegation is only for handoff chains (product-owner → developer → qa → devops)
where each step feeds the next.

Good fan-outs:
- "analyse module X for both security and performance" → `reviewer` (security) + `developer` (perf) in one turn
- "write tests for modules A, B, C" → three `developer` agents in one turn, then a single `qa` turn to validate

Agents whose frontmatter declares `isolation: worktree` run in separate git
worktrees — use them freely in parallel without worrying about file-edit races.

## Installed team

Available sub-agents (see `.claude/agents/`):
- `product-owner` — Every project needs someone to turn ideas into specs and guard against building the wrong thing.
- `business-analyst` — Every non-trivial project benefits from explicit process mapping and domain validation.
- `developer` — Primary language detected: typescript.
- `qa` — No test framework detected, but every project needs a QA discipline.

Available skills & workflows (see `.claude/skills/`):
- `prd` (skill) — Universal — every feature starts from a spec.
- `review` (skill) — Universal — every change benefits from structured review.
- `debug` (skill) — Universal — every codebase has bugs.
- `test` (skill) — No test framework detected yet — install this skill to define the testing approach.
- `scaffold` (skill) — Useful for bootstrapping new modules or features with consistent structure.
- `new-app` (workflow) — For greenfield projects started from this repo.
- `new-feature` (workflow) — Standard feature lifecycle — useful for every active project.
- `bug-fix` (workflow) — Standard bug fix pipeline.
- `hotfix` (workflow) — Emergency production fix pipeline.

Run `/agents` in Claude Code to browse sub-agents with their descriptions.

## Style guide

https://google.github.io/styleguide/tsguide.html
