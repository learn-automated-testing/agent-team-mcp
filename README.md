# agent-team-mcp

A stdio **Model Context Protocol** server that inspects any project and installs an opinionated, agent-orchestrated team into it — sub-agents, capability skills, path-scoped rules, and end-to-end workflows.

Think of it as `create-react-app`, but for the team of AI agents that will work in the project — and for the rules that keep them consistent over time.

> **Host compatibility.** The server speaks plain MCP, so any MCP-capable client can call its tools (Claude Code, Cursor, Cline, Copilot in VS Code, Gemini CLI). The artifacts it writes today target **Claude Code's `.claude/` layout**. Other hosts (Copilot's `.github/copilot-instructions.md`, Gemini's `GEMINI.md`) are roadmap, not shipped — see *Roadmap* below.

---

## What it produces

When you run `install_setup`, this MCP writes the following into your project:

```
.claude/
├── agents/                 # sub-agents — product-owner, architect, developer, qa, devops, ui-designer, monitoring, ...
├── skills/                 # capability skills — prd, debug, review, test, scaffold, monitoring, iac, deploy, ...
├── rules/                  # path-scoped rules — commit-format, no-secrets, ts-strict-typing, ...
├── context.md              # single source of truth for stack, conventions, domain
├── state.json              # current workflow step (live cursor)
└── .skillsrepo.json        # metadata: version, installed agents/skills, lessons
CLAUDE.md                   # entry point Claude Code auto-loads
```

Each agent and skill is rendered from a template under `templates/` and gets a *Detected stack* section injected from your project's fingerprint (language, frameworks, test/CI/IaC tooling, mobile platforms, deploy targets).

---

## Install

```bash
git clone <this repo> agent-team-mcp
cd agent-team-mcp
npm install
npm run build
```

### Configure in Claude Code

Add to your Claude Code MCP config (typically `~/.claude/settings.json` under `mcpServers`):

```json
{
  "mcpServers": {
    "skillsrepo": {
      "command": "node",
      "args": ["/absolute/path/to/agent-team-mcp/dist/index.js"]
    }
  }
}
```

> The MCP server identifier remains `skillsrepo` for backwards compatibility. Tools therefore appear in your client as `mcp__skillsrepo__inspect_project`, `mcp__skillsrepo__add_rule`, etc. Renaming the wire identifier would break existing installed projects, so the npm package was renamed but the protocol name was kept.

Restart Claude Code and the tools become available.

### Configure in Cursor / Cline / Gemini CLI

Any MCP-capable client takes a similar entry. Use `command: "node"` with the absolute path to `dist/index.js`, or once published, `npx agent-team-mcp`.

---

## The tools — grouped by job

The server exposes 17 tools. Group them mentally as: *bootstrap, rules, lessons & memory, maintenance.*

### 1. Bootstrap a project

| Tool | What it does |
|---|---|
| `inspect_project` | Scans a directory and returns a **fingerprint** — primary language, frameworks, test/CI/IaC tooling, mobile platforms, existing docs, installed MCPs. Read-only. |
| `recommend_setup` | Given a fingerprint, returns a **plan** — which agents and skills to install, which to skip, and the open questions only a human can answer (primary user, domain, style guide). |
| `install_setup` | Executes the plan: writes `.claude/agents/`, `.claude/skills/`, `.claude/context.md`, `.claude/state.json`, `.claude/.skillsrepo.json`, and `CLAUDE.md`. Skips existing files unless `overwrite=true`. |

### 2. Rules — path-scoped guardrails

Rules live under `.claude/rules/*.md` and are loaded by every agent before it edits matching files. Use them for hard project conventions (commit format, no secrets, TypeScript strict typing, integration test requirements).

| Tool | What it does |
|---|---|
| `list_rule_templates` | Shows the curated rule library (commit-format, no-secrets-in-code, input-validation, ts-strict-typing, test-flake-tolerance, etc.). |
| `install_rule_from_template` | Copies one template into `.claude/rules/`. |
| `add_rule` | Creates a custom rule from inline text. Validates kebab-case naming and dedup. |
| `list_rules` | Shows currently installed rules. |
| `merge_rules` | Combines two rules into one — useful when audit flags overlap. |
| `archive_rule` | Retires a rule into `.claude/rules/_archived/` with a reason. |
| `audit_rules` | Detects drift, overlap, dead rules, and missing-context references. |
| `generate_audit_report` | Renders the audit as a standalone HTML page for sharing. |

### 3. Lessons & memory — capture what was learned

Lessons are project-specific facts that don't fit as rules ("we use integer cents", "all timestamps UTC", "auth tokens never logged"). They append to `.claude/context.md`'s *Learned conventions* section so every agent reads them.

| Tool | What it does |
|---|---|
| `capture_lesson` | Records a lesson with an explicit **reason**. Rejects anything without one. Dedupes case-insensitively. |
| `list_lessons` | Returns lessons, optionally filtered by category. |
| `mine_memory` | Reads Claude Code's per-project auto-memory (`~/.claude/projects/<encoded>/memory/*.md`), dedupes against installed rules and lessons, returns novel candidates with a suggested target. **Read-only.** |
| `promote_memory` | Converts one mined candidate into a real rule or lesson — delegates to `add_rule` / `capture_lesson` so all validation is inherited. |

### 4. Maintenance

| Tool | What it does |
|---|---|
| `refine_item` | Improves one installed agent or skill — runs a structured review (clarity, completeness, conflicts) and rewrites in place. |
| `measure_team` | Health metrics on the installed team — coverage, recency, drift signals. |

---

## Typical workflow — from zero to working team

### Bootstrap a fresh project

In Claude Code:

```
1. Call mcp__skillsrepo__inspect_project { projectDir: "/path/to/project" }
   → returns fingerprint

2. Call mcp__skillsrepo__recommend_setup { fingerprint }
   → returns plan + open_questions

3. Answer the open questions (primary_user, domain, style_guide)

4. Call mcp__skillsrepo__install_setup {
     plan, fingerprint,
     answers: { primary_user, domain, style_guide },
     hooks: true
   }
   → writes .claude/, CLAUDE.md
```

Restart Claude Code in the project. The team is live.

### Add the first rules

```
mcp__skillsrepo__list_rule_templates           # see what's available
mcp__skillsrepo__install_rule_from_template    # pick the ones you want
mcp__skillsrepo__add_rule                      # add custom ones inline
```

### Capture lessons as you work

When the AI gets corrected or you discover a non-obvious convention:

```
mcp__skillsrepo__capture_lesson {
  projectDir: ".",
  lesson: "all monetary values stored as integer cents, never floats",
  reason: "float arithmetic caused $0.01 drift in invoice totals (Q1 incident)"
}
```

### Quarterly maintenance

```
mcp__skillsrepo__mine_memory                   # surface novel patterns from Claude's memory
mcp__skillsrepo__promote_memory                # convert worthwhile ones into rules/lessons
mcp__skillsrepo__audit_rules                   # check for drift, overlap, dead rules
mcp__skillsrepo__generate_audit_report         # share with the team
mcp__skillsrepo__measure_team                  # team health metrics
```

---

## Templates layout

The substance of the team lives in `templates/`:

```
templates/
├── agents/                 # one .md per agent persona (product-owner, architect, developer, ...)
├── skills/                 # one folder per skill (prd, debug, review, monitoring, iac, ...)
│   └── <name>/SKILL.md
├── workflows/              # multi-step pipelines (new-app, new-feature, bug-fix, hotfix)
├── snippets/               # reusable fragments (handoff-protocol)
├── rule-library.json       # curated rule templates
├── CLAUDE.md.tmpl          # rendered CLAUDE.md
└── context.md.tmpl         # rendered .claude/context.md
```

Edit a template → next `install_setup` (or `refine_item`) propagates the change.

---

## Development

```bash
npm run dev                 # tsc --watch
npm test                    # vitest run
npm run build               # tsc + chmod +x dist/index.js
node scripts/smoke.mjs      # end-to-end smoke against a temp project
```

The codebase follows the project's own conventions (see `.claude/rules/` and `CLAUDE.md`):

- TypeScript strict; no `any`; explicit return types on exports
- Files under 300 lines — split before you hit it
- Every `await` that can reject is in a try/catch with a contextual error
- Tests use `it("should ...")` style — one behavioural intent per test
- No mocks for the thing under test; never retry-wrap a flaky test

---

## Roadmap — multi-host support

Today the artifacts target Claude Code. The following would add other hosts as **emit targets**, not rewrites:

- `install_setup --target=copilot` → writes `.github/copilot-instructions.md` plus path-scoped `*.instructions.md` files. Sub-agents flatten into a single instructions file (Copilot has no sub-agent concept), skills become referenced docs.
- `install_setup --target=gemini` → writes `GEMINI.md` plus referenced docs. Same flattening trade-off.
- The MCP tools themselves (`inspect_project`, `recommend_setup`, `add_rule`, ...) already work in any MCP-capable client today.

Interested? Open an issue with your target host and we'll scope it.

---

## License & contributing

See `CONTRIBUTING.md`. Issues and PRs welcome — particularly new agent/skill templates, new rules for the library, and additional language/framework detection in `src/core/inspect.ts`.
