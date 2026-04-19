# PRD: sub-agent delegation

## Problem statement
Agent templates describe handoffs in prose ("Hand off to QA when build is complete").
Claude Code's actual sub-agent invocation mechanism — the `Task` tool with `subagent_type` —
is not wired into any agent's workflow. The result: handoffs are advisory. A vibe-coding
session loses momentum whenever the user has to notice the prose cue and manually tell
Claude to switch roles, or work gets done by the wrong role because the transition never
fires.

## Goal
Every agent handoff in installed teams becomes an actual `Task(subagent_type: …)` invocation
inside the agent's workflow, so role transitions execute automatically when the work
prerequisite is met.

## Users
- AI developers using skillsrepo-installed teams in Claude Code
- The main Claude thread orchestrating work, which currently has to be told to spawn each sub-agent

## User stories
- **must-have** As an AI developer, when the developer agent finishes implementation, it invokes the `qa` sub-agent with the build summary — I do not have to prompt the switch.
- **must-have** As an AI developer, when `qa` passes, it invokes `devops` to deploy — the whole feature lifecycle runs without intermediate prompts.
- **must-have** As an AI developer, every handoff updates `state.json` before the next agent is invoked, so the receiving agent has context.
- **should-have** As an AI developer, I can inspect the resolved handoff path in state.json after the fact (e.g. "developer → qa → devops at 14:02").

## Functional requirements
1. Each agent template's "Your workflow" section includes an explicit procedural step of the form: `Invoke the {target} sub-agent via the Task tool with subagent_type="{target}" and prompt="{summary}"`.
2. A shared `templates/snippets/handoff.md` (new) defines the standard handoff block; each agent template includes the block, parameterised by target role.
3. Every handoff is preceded by a state.json update step in the same workflow section.
4. `refine_item({resyncBody: true})` pulls in the updated handoff snippet for existing installed agents.

## Non-functional requirements
- Backward compatible: existing installations keep working; the change is a template update, applied on next `refine_item`/`install_setup --overwrite`.
- Works identically in Claude.ai and Claude Code as long as the `Task` tool is available.

## Out of scope
- Handoff to external tools (GitHub, Slack, email)
- Error recovery when a sub-agent fails (handled by workflow "Failure handling" sections)
- User-configurable handoff targets per install — the defaults are enough for v1

## Open questions
- Does Claude Code's `Task` tool work when called from inside a sub-agent context, or only from the main thread? Needs a quick test before we commit to the design.
- Synchronous (wait for sub-agent reply) or fire-and-forget? Default sync, but worth confirming.

## Success metrics
- ≥ 90% of feature lifecycles in dogfooding run end-to-end without the user having to say "now invoke qa" or similar.
- Zero stalls where `state.json` is in a handoff-ready state but no agent picks up within the next tool turn.
