---
id: US-001
epic: EPIC-015-rule-recommendations
priority: must-have
status: done
testing: [unit, integration]
---

# US-001 — Fingerprint drives an auto-installed rule pack

As an **AI developer running `install_setup` on a fresh project**, I want **a starter rule pack auto-installed under `.claude/rules/` based on my project's language and stack**, so that **I don't start with an empty rules folder and the rules I do get are actually relevant to my codebase**.

## Context

`recommend.ts` plans agents and skills but never rules; `install.ts` accordingly leaves `.claude/rules/` empty. The 37-template library at `templates/rule-library.json` already has language-tagged entries (`typescript`, `python`, `go`, `rust`, `react`, etc.) plus universal ones (`security`, `git`, `pr`, `testing`). This story wires them together.

**Existing implementation:** none for the recommendation; `src/core/rules.ts` (addRule) + `src/core/template-library.ts` (rule library) + `src/tools/installRuleFromTemplate.ts` already exist and stay as-is.
**Builds on:** EPIC-002 add_rule MCP, the rule library, the install report shape from EPIC-003.

## Acceptance criteria

- [x] `SetupPlan` gains `rules: PlannedRule[]` and `skippedRules: { id: string, reason: string }[]`. `PlannedRule` matches `PlannedSkill` shape (`id`, `reason`, `confidence`).
- [x] A new `recommendRules(fp: Fingerprint)` function returns the chosen rule template ids based on:
  - Universal always: `no-secrets-in-code`, `commit-format`, `pr-size`, `test-naming`, `test-one-assertion`, `test-flake-tolerance`, `input-validation`.
  - `primaryLanguage === "typescript"` (or `js` filenames present): adds `ts-strict-typing`, `ts-file-length`, `ts-async-error-handling`, `js-async-await`.
  - `primaryLanguage === "python"`: adds `py-type-hints`, `py-format-black`.
  - `primaryLanguage === "go"`: adds `go-error-return-checked`, `go-no-panic`, `go-context-cancel`.
  - `primaryLanguage === "rust"`: adds `rust-no-unwrap`, `rust-prefer-result`.
  - `testFrameworks` contains `pytest`: adds `pytest-fixtures`, `pytest-parametrize`.
  - `hasDatabase === true`: adds `parameterized-sql`, `db-utc-timestamps`, `db-money-as-cents`.
  - `hasFrontend === true`: adds `a11y-wcag-level`, `semantic-html`.
- [x] `installSetup` writes each planned rule via `addRule(...)` using the library's defaults (no parameterised answers in v1). Existing rule files are preserved when `overwrite=false` — the install records each preserve in `report.skipped` with reason `"already exists"`. With `overwrite=true`, rules are replaced.
- [x] `InstallReport` gains a `rules: Array<{ id: string; path: string }>` field, populated for every successfully written rule.
- [x] If a planned rule id is missing from the rule library, the install throws with a clear error naming the missing id — never installs a partial set silently.
- [x] On `ai-documentgen-agent`-style fixture (`primaryLanguage: "python"`, no test framework yet, no DB, no frontend): exactly the universal pack + `py-type-hints` + `py-format-black` ship. None of `ts-*`, `js-*`, `go-*`, `rust-*` ship.
- [x] On a TypeScript fixture (`primaryLanguage: "typescript"`, `testFrameworks: ["vitest"]`, no DB): the universal pack + `ts-*` + `js-async-await` ship. `pytest-*` does NOT ship.

## Testing

- **Unit (`vitest`)** — in `src/core/rule-recommendation.test.ts` (new file): one `it should` per language branch, asserting `recommendRules(fp).map(r => r.id)` contains the right ids and excludes the wrong ones. Plus one test asserting universals are always present. Plus one test asserting a fingerprint with no primary language gets universals only.
- **Integration (`vitest`)** — extend `src/core/install-target.test.ts`: fingerprint a tmpdir as Python, run `installSetup`, assert `.claude/rules/py-type-hints.md` and `.claude/rules/no-secrets-in-code.md` exist while `.claude/rules/ts-strict-typing.md` does not. Same shape for TypeScript fixture asserting the inverse.
- **Integration (failure case)** — pass a hand-crafted `SetupPlan` with a rules entry whose `id` isn't in the library, assert `installSetup` throws and the error message names the missing id.

## Notes / implementation hints

- `recommend.ts` is the natural home for `recommendRules`. Keep it pure (no I/O) — read the fingerprint, return the planned list. The function is called by `recommendSetup` and the result lives on the returned `SetupPlan`.
- `install.ts` orchestrates the actual writes — call `addRule({ projectDir, name: id, title, rules, reason, paths, ...overwrite })` from `template-library.ts`'s `installRuleFromTemplateLogic` (or call that helper directly). Don't re-implement file writes.
- The CLAUDE.md template already says "Check `.claude/rules/*.md`" — no template change needed for this story.
- Universal pack contains `test-*` rules which are framework-agnostic per their description; the spec calls them universal on purpose.

## Open questions

- Should `existingSkills` on the fingerprint (e.g. `test` skill not yet installed) gate any test rules? — answered: no, rules are independent of skills. Test-rule guidance is useful even before a test framework is in place.
