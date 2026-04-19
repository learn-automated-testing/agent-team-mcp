# PRD: auto-memory promotion

## Problem statement
Claude Code's auto-memory watches for corrections and writes them to
`~/.claude/projects/<project>/memory/` automatically — but those learnings are
**machine-local and personal**. Team-shared artifacts (rules, lessons) are version-
controlled under `.claude/`. There's no bridge between the two, so personal learnings
never become team conventions unless the user manually notices and types out
`capture_lesson` or `add_rule`.

## Goal
Read Claude's own auto-memory, dedupe against already-captured team artifacts, surface
candidates for promotion to team-shared rules or lessons, and provide a one-call tool to
promote a chosen candidate into the right file. Promotion is always user-approved — no
auto-write to version-controlled files.

## Users
- AI developers at session-end who want to snapshot what Claude learned into shared rules
- Team leads auditing patterns that emerged across dogfooding sessions

## User stories
- **must-have** `mine_memory({projectDir})` returns a list of candidate entries from
  auto-memory that don't already appear in `.claude/rules/`, `.claude/.skillsrepo.json`
  lessons, or `.claude/context.md`'s Learned conventions section.
- **must-have** Each candidate carries a suggested `target` (`rule` or `lesson`), a
  suggested `name`/category, and (for rules) a suggested `paths:` glob inferred from
  language mentions.
- **must-have** `promote_memory({projectDir, target, ...})` converts one candidate into
  a real rule or lesson by delegating to the existing `addRule` / `captureLesson`
  machinery — no new write path to maintain.
- **must-have** `mine_memory` is read-only. `promote_memory` takes one explicit entry;
  there is no bulk auto-promote.
- **should-have** A `memoryDir` override on `mine_memory` for testing and for users
  whose auto-memory lives outside the default location.

## Functional requirements
1. New `src/core/memory-mine.ts`:
   - Default memory dir: `~/.claude/projects/<encodedProjectPath>/memory/` where
     `encodedProjectPath = absProjectPath.replace(/\//g, "-")` (matches Anthropic's
     on-disk encoding).
   - Read `MEMORY.md` and any sibling `*.md` topic files if present.
   - Parse markdown list items (`- ...` and `1. ...`) as candidate entries, plus
     `## `-delimited sections as category headers.
   - Normalize each entry (trim + lowercase + collapse whitespace) and dedup against:
     - text content of every file under `.claude/rules/`
     - `lessons[]` in `.claude/.skillsrepo.json`
     - bullets under `## Learned conventions` in `.claude/context.md`
   - For each surviving entry, infer a `target` and metadata:
     - Mentions `typescript|ts|python|py|go|rust|java|kotlin|swift` → `target: "rule"`,
       `paths` inferred from the language
     - Starts with an incident phrase (`never`, `always`, `whenever`, `because`) →
       `target: "rule"` if scope-like, else `target: "lesson"`
     - Otherwise default `target: "lesson"`, `category: "code"`
   - Return `{ memoryDir, candidates: [...], total, alreadyCaptured }`.
2. New `src/core/promote.ts`:
   - `promoteAsRule(projectDir, {name, title, rules, paths?, reason?, ...}, overwrite?)`
     → thin wrapper around existing `addRule`.
   - `promoteAsLesson(projectDir, {category, lesson, reason})` → wraps `captureLesson`.
3. New MCP tools `mine_memory` and `promote_memory`.
4. Smoke test: prepared fixture memory dir, verify candidates surface, dedup against
   an existing rule, promote one candidate as a rule and one as a lesson, confirm files.

## Non-functional
- Read-only on auto-memory — never edit or delete from there.
- Promotion reuses `addRule`/`captureLesson`, so validation (non-empty reason,
  kebab-case names, dedup) is inherited automatically.
- Works gracefully when auto-memory directory does not exist — returns `total: 0`.

## Out of scope
- Auto-promotion without user approval
- Cross-project mining (one project at a time)
- Semantic dedup (string-normalization only)
- Editing auto-memory to mark entries as "promoted"
- Hook-triggered periodic mining (possible PRD 8)

## Open questions
- The exact encoding of `<encodedProjectPath>` — we assume simple `/` → `-`. If
  Anthropic changes it, mining breaks silently.
- Whether to write a pointer back into auto-memory (e.g. "promoted to rule: X") to
  prevent re-surfacing. v1 skips — dedup against team artifacts handles it.

## Success metrics
- `mine_memory` returns ≥ 1 candidate after a week of real dogfooding.
- ≥ 50% of surfaced candidates get promoted (signal that categorization is useful).
- Zero false-promotion incidents in smoke + dogfooding.
