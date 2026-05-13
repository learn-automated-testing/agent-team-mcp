# agent-team-mcp

This repo has a skillsrepo-managed team installed. Sub-agents live in `.claude/agents/`,
skills in `.claude/skills/`, path-scoped rules in `.claude/rules/`.

## Project

- **Primary language:** typescript
- **Frameworks:** mcp
- **Test framework:** vitest
- **Deploy target:** (none)
- **Primary user:** (not specified)
- **Domain:** (not specified)

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
- `qa` — Test framework detected: vitest.
- `technical-writer` — Every project benefits from a dedicated docs perspective — README, ADRs, changelog, release notes. Invoked for coherent docs passes rather than inline edits.
- `monitoring` — Every project that runs in production needs a dedicated observability perspective — SLOs, dashboards, alert hygiene, incident triage.
- `architect` — Every project benefits from explicit system-design ownership — ADRs, technology choice, module boundaries, NFRs — before code is written.

Available skills & workflows (see `.claude/skills/`):
- `prd` (skill) — Universal — every feature starts from a PRD (top of the spec hierarchy).
- `epic` (skill) — Universal — decomposes a confirmed PRD into coherent slices of work.
- `user-story` (skill) — Universal — turns each epic into buildable stories with explicit acceptance criteria.
- `review` (skill) — Universal — every change benefits from structured review.
- `debug` (skill) — Universal — every codebase has bugs.
- `docs` (skill) — Universal — public API / config / behaviour changes need matching doc updates; ADRs, changelog, release notes.
- `monitoring` (skill) — Universal — every shipped feature needs SLOs, signals, and runbook-backed alerts before it serves real users.
- `test` (skill) — Test framework detected: vitest.
- `scaffold` (skill) — Useful for bootstrapping new modules or features with consistent structure.
- `new-app` (workflow) — For greenfield projects started from this repo.
- `new-feature` (workflow) — Standard feature lifecycle — useful for every active project.
- `bug-fix` (workflow) — Standard bug fix pipeline.
- `hotfix` (workflow) — Emergency production fix pipeline.

**Spec hierarchy:** PRD → Epic → User Story. The `prd` skill produces capabilities (one-liners) at `docs/requirements/PRD-NNN-<slug>/PRD-NNN-<slug>.md`; the `epic` skill carves epics under that PRD's folder; the `user-story` skill writes individual stories with acceptance criteria. Never hand a PRD straight to a developer — always decompose through the epic and user-story skills first.

Run `/agents` in Claude Code to browse sub-agents with their descriptions.

## Style guide

(not specified)
