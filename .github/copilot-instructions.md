# GitHub Copilot instructions — agent-team-mcp

This repo's customization layer is shared between **GitHub Copilot** and **Claude Code**. Copilot reads this file plus `.claude/skills/`, `.claude/agents/`, and `CLAUDE.md` automatically — there is one source of truth, not two parallel setups.

## How customization is organized

| Concern | Canonical location | Read by |
| --- | --- | --- |
| Repo-wide rules (this file) | `.github/copilot-instructions.md` + `CLAUDE.md` | Copilot, Claude Code |
| Path-scoped rules (Copilot globs) | `.github/instructions/*.instructions.md` | Copilot |
| Path-scoped rules (Claude format) | `.claude/rules/*.md` | Claude Code |
| Procedural skills / workflows | `.claude/skills/<name>/SKILL.md` | Copilot, Claude Code |
| Sub-agent personas | `.claude/agents/<name>.md` | Copilot, Claude Code |
| Project context (stack, domain) | `.claude/context.md` | Copilot, Claude Code |

When a rule and a path-scoped instruction overlap, treat them as the same rule expressed for two engines — do not contradict one with the other.

## Stack

- **Language:** typescript
- **Frameworks:** mcp
- **Test framework:** vitest
- **Deploy target:** (none)
- **Domain:** (not specified) (primary user: (not specified))
- **Style guide:** (not specified)

Full project context — stack, conventions, domain knowledge, learned lessons — lives in `.claude/context.md`. Read it before non-trivial work.

## Core conventions

- Check `.claude/rules/*.md` and `.github/instructions/*.instructions.md` for path-scoped rules before editing source files.
- Update `.claude/state.json` when entering or completing a workflow step.
- Read the relevant skill (`.claude/skills/<name>/SKILL.md`) before using its capability.
- Delegate specialized work to the matching sub-agent under `.claude/agents/` rather than doing it inline.
- Never commit secrets, `.env` files, or API keys.
- Never deploy with failing tests or an unclean git state.

## Repo-wide guardrails

- **Commit format:** Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`). Subject ≤72 chars, imperative mood. Body explains the **why**, not the **what**.
- **PR size:** Stay under 400 lines changed. Split larger changes into a series — one logical concern per PR. Refactor PRs are separate from behavioral-change PRs.
- **No secrets in code or logs.** Use environment variables or a secret manager. A leaked secret must be **rotated** — a revert is not sufficient.
- **Validate input at the boundary.** Every HTTP handler, queue consumer, or file parser validates input against an explicit schema before use. Reject unknown fields. Return 400-level errors with a specific field name on validation failure.

## Installed sub-agents

Available under `.claude/agents/` — invoke via the `Task` tool (Claude Code) or by referencing the persona in chat (Copilot):

- `product-owner` — Every project needs someone to turn ideas into specs and guard against building the wrong thing.
- `business-analyst` — Every non-trivial project benefits from explicit process mapping and domain validation.
- `developer` — Primary language detected: typescript.
- `qa` — Test framework detected: vitest.
- `technical-writer` — Every project benefits from a dedicated docs perspective — README, ADRs, changelog, release notes. Invoked for coherent docs passes rather than inline edits.
- `monitoring` — Every project that runs in production needs a dedicated observability perspective — SLOs, dashboards, alert hygiene, incident triage.
- `architect` — Every project benefits from explicit system-design ownership — ADRs, technology choice, module boundaries, NFRs — before code is written.

## Skills & workflows

Available under `.claude/skills/` — read the relevant `SKILL.md` before using:

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

## Orchestration (Claude Code only)

When a task decomposes into independent sub-tasks, **delegate in parallel** — one turn with multiple `Task` tool calls, not one call per turn. Sequential delegation is only for handoff chains (product-owner → developer → qa) where each step feeds the next. Agents whose frontmatter declares `isolation: worktree` run in separate git worktrees and can fan out without file-edit races.

Copilot does not yet have an equivalent multi-agent orchestrator — when working in Copilot, follow the persona of one sub-agent at a time and reference its file under `.claude/agents/`.
