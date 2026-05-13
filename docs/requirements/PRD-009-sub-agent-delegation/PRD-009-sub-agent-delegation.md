# PRD-009 — Sub-agent delegation

> **Status:** done (2026-05-10)
> **Owner:** <TBD>
> **Reviewers:** <TBD>
> **Originally:** `docs/prd/sub-agent-delegation.md` (migrated to this hierarchy — see git history)

## Problem statement

Agent templates describe handoffs in prose ("Hand off to QA when build is complete"). Claude Code's actual sub-agent invocation mechanism — the `Task` tool with `subagent_type` — is not wired into any agent's workflow. The result: handoffs are advisory. A vibe-coding session loses momentum whenever the user has to notice the prose cue and manually tell Claude to switch roles, or work gets done by the wrong role because the transition never fires.

## Goal

Every agent handoff in installed teams becomes an actual `Task(subagent_type: …)` invocation inside the agent's workflow, executed automatically when the work prerequisite is met.

## Users

- **AI developers using installed teams** — want lifecycle transitions to fire without manual prompting.
- **The main Claude thread** — needs an explicit invocation directive instead of prose to act on.

## Capabilities (high level)

- Each agent template includes an explicit `Task(subagent_type=…)` step in its "Your workflow" section.
- A shared `templates/snippets/handoff.md` defines the standard handoff block, parameterised by target role.
- Every handoff is preceded by an explicit `state.json` update step in the same section.
- `refine_item({resyncBody: true})` pulls the updated handoff snippet into existing installed agents.

## Non-functional requirements

- **Backward compatibility:** existing installations keep working; the change is a template update applied on next `refine_item` / `install_setup --overwrite`.
- **Engine portability:** works identically in Claude.ai and Claude Code as long as `Task` is available.

## Out of scope

- Handoff to external tools (GitHub, Slack, email).
- Error recovery when a sub-agent fails (handled by workflow "Failure handling" sections).
- User-configurable handoff targets per install.

## Open questions

- Does Claude Code's `Task` tool work when called from inside a sub-agent context, or only from the main thread?
- Synchronous (wait for sub-agent reply) or fire-and-forget? Default sync, but worth confirming.

## Success metrics

- ≥ 90% of feature lifecycles in dogfooding run end-to-end without the user having to say "now invoke qa" or similar.
- Zero stalls where `state.json` is in a handoff-ready state but no agent picks up within the next tool turn.

---

## Epics

- [EPIC-012 — Task handoff snippet](./EPIC-012-task-handoff-snippet/EPIC-012-task-handoff-snippet.md)
