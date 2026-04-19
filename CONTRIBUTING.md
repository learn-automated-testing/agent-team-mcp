# Contributing to skillsrepo-mcp

## Build & run
- `npm run build` — compile TS to `dist/`
- `npm run dev` — watch mode
- `node scripts/smoke.mjs` — end-to-end smoke over stdio

## Code conventions
- TypeScript strict mode; `any` is a review blocker — use `unknown` + narrow
- ESM only; imports use `.js` extension even for `.ts` files (NodeNext resolution)
- One exported symbol per file where reasonable; co-locate small helpers
- Throw on invariant violation; do not swallow errors silently
- Follow the Google TypeScript style guide for naming and layout:
  https://google.github.io/styleguide/tsguide.html

## Adding a role template
1. Create `templates/<id>/template.yaml` with `id`, `title`, `description`, `questions[]`.
2. Add `templates/<id>/claude/skill.md` and `templates/<id>/claude/agent.md`.
3. Add `templates/<id>/copilot/skill.md` and `templates/<id>/copilot/agent.md`.
4. Question id `name` is required — the renderer uses it for the output filename.
5. Every `{{var}}` in the template bodies must match a question `id`; unmatched vars render as `(none)`.

## Adding a workflow
- Create `templates/workflows/<id>.yaml` with ordered `steps[]`.
- Each step's `skill` must match an existing template `id`.

## Adding a tool
- One file per tool under `src/tools/<name>.ts`; export `register<Name>(server)`.
- Register it in `src/index.ts`.
- Use Zod schemas for `inputSchema`.

## Tests
- Current regression net: `scripts/smoke.mjs` — keep it green on every change.
- Target (when added): Vitest + `InMemoryTransport` from `@modelcontextprotocol/sdk`
  for in-process tool calls. Every tool should get a happy-path test plus one
  error-path test.
