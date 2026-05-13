import type { Fingerprint, PlannedRule } from "./types.js";

const UNIVERSAL_RULE_IDS: readonly string[] = [
  "no-secrets-in-code",
  "commit-format",
  "pr-size",
  "test-naming",
  "test-one-assertion",
  "test-flake-tolerance",
  "input-validation",
];

const TS_RULE_IDS: readonly string[] = [
  "ts-strict-typing",
  "ts-file-length",
  "ts-async-error-handling",
  "js-async-await",
];

const PYTHON_RULE_IDS: readonly string[] = ["py-type-hints", "py-format-black"];

const GO_RULE_IDS: readonly string[] = [
  "go-error-return-checked",
  "go-no-panic",
  "go-context-cancel",
];

const RUST_RULE_IDS: readonly string[] = ["rust-no-unwrap", "rust-prefer-result"];

const PYTEST_RULE_IDS: readonly string[] = ["pytest-fixtures", "pytest-parametrize"];

const DB_RULE_IDS: readonly string[] = [
  "parameterized-sql",
  "db-utc-timestamps",
  "db-money-as-cents",
];

const FRONTEND_RULE_IDS: readonly string[] = ["a11y-wcag-level", "semantic-html"];

function isJavaScriptPrimary(fp: Fingerprint): boolean {
  // Trigger the TS pack only when JS/TS is the dominant language. A handful of
  // .js config files in a Python project must not pull in TypeScript rules
  // (US-001 AC: a Python fingerprint ships zero `ts-*`/`js-*`).
  return fp.primaryLanguage === "javascript" || fp.primaryLanguage === "js";
}

/**
 * Pure recommender for the starter rule pack. Translates a project fingerprint
 * into the list of rule-template ids `installSetup` should install.
 *
 * No I/O — safe to call from anywhere.
 */
export function recommendRules(fp: Fingerprint): PlannedRule[] {
  const rules: PlannedRule[] = [];

  for (const id of UNIVERSAL_RULE_IDS) {
    rules.push({
      id,
      reason: "Universal — applies to every project regardless of stack.",
      confidence: "high",
    });
  }

  if (fp.primaryLanguage === "typescript" || isJavaScriptPrimary(fp)) {
    for (const id of TS_RULE_IDS) {
      rules.push({
        id,
        reason: `Primary language detected: ${fp.primaryLanguage ?? "javascript"}.`,
        confidence: "high",
      });
    }
  }

  if (fp.primaryLanguage === "python") {
    for (const id of PYTHON_RULE_IDS) {
      rules.push({ id, reason: "Primary language detected: python.", confidence: "high" });
    }
  }

  if (fp.primaryLanguage === "go") {
    for (const id of GO_RULE_IDS) {
      rules.push({ id, reason: "Primary language detected: go.", confidence: "high" });
    }
  }

  if (fp.primaryLanguage === "rust") {
    for (const id of RUST_RULE_IDS) {
      rules.push({ id, reason: "Primary language detected: rust.", confidence: "high" });
    }
  }

  if (fp.testFrameworks.includes("pytest")) {
    for (const id of PYTEST_RULE_IDS) {
      rules.push({ id, reason: "pytest detected in test frameworks.", confidence: "high" });
    }
  }

  if (fp.hasDatabase) {
    for (const id of DB_RULE_IDS) {
      rules.push({
        id,
        reason: "Database dependency detected (ORM or driver).",
        confidence: "high",
      });
    }
  }

  if (fp.hasFrontend) {
    for (const id of FRONTEND_RULE_IDS) {
      rules.push({
        id,
        reason: "Frontend detected — accessibility and semantic-HTML rules apply.",
        confidence: "high",
      });
    }
  }

  return rules;
}
