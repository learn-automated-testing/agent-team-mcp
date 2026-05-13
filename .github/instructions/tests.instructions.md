---
applyTo: "**/*.test.*,**/*_test.*,**/*.spec.*,tests/**/*"
---

# Test rules

Test framework: **vitest**.

## Naming

- Test names follow the *it-should* style — never generic names like `test_1` or `testFoo`.
- A failing test name alone should tell you what broke without reading the code.
- Use `describe` blocks to group related intents.

**Why:** The test report is a spec of the system's intended behaviour — make it readable.

## One assertion of intent per test

- Each test asserts one behavioural intent. Many setups is fine; many intents is a smell — split.
- Test names describe the intent, e.g. `it('rejects empty email')`, not `it('test1')`.
- Never mock the thing under test.

**Why:** Focused tests pinpoint failures. Multi-intent tests hide which behaviour broke.

## Zero tolerance for flaky tests

- Any test that fails intermittently is **quarantined** (skip with reason + ticket) — never wrapped in retries.
- Do not add `retry` mechanisms around tests to mask flakiness.
- Root-cause flakes: race conditions, shared state, time dependency, or external-service reliance.

**Why:** Retrying hides real bugs and trains the team to ignore failing tests.
