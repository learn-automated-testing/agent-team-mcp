---
id: US-001
epic: EPIC-012-task-handoff-snippet
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — Shared handoff snippet renders into agent workflow sections

As an **AI developer**, I want **each installed agent's "Your workflow" section to include an explicit `Task(subagent_type=<target>)` invocation**, so that **handoffs fire automatically — I don't have to prompt the next role**.

## Context

A shared `templates/snippets/handoff.md` defines the standard handoff block, parameterised by target role. Each agent template includes the snippet at the appropriate workflow step.

**Existing implementation:** snippet renderer in the install pipeline; agent templates under `templates/`.

## Acceptance criteria

- [x] After install, every agent body that has a downstream role contains an explicit `Task` invocation step naming the target `subagent_type`.
- [x] The snippet renders identically (modulo target role) across agent templates.
- [x] The snippet is sourced from `templates/snippets/handoff.md` — not duplicated per template.

## Testing

- **Unit (vitest)**: snippet renderer test asserts target role is interpolated.
- **Integration (vitest)**: install fixture asserts the snippet appears in each agent body that has a downstream role.

## Notes / implementation hints

Default semantics are synchronous (wait for sub-agent reply) — see PRD-009 open questions.
