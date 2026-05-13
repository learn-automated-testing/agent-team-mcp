import { describe, expect, it } from "vitest";
import { recommendRules } from "./recommend-rules.js";
import type { Fingerprint } from "./types.js";

function blankFingerprint(overrides: Partial<Fingerprint>): Fingerprint {
  return {
    projectDir: "/tmp/x",
    projectName: "x",
    languages: {},
    primaryLanguage: null,
    packageManagers: [],
    frameworks: [],
    testFrameworks: [],
    ci: [],
    deployTargets: [],
    iacTools: [],
    hasFrontend: false,
    hasDatabase: false,
    mobilePlatforms: [],
    installedMcps: [],
    docs: { readme: null, contributing: null, docsDir: null },
    existingAgents: [],
    existingSkills: [],
    git: null,
    ...overrides,
  };
}

const UNIVERSAL_IDS = [
  "no-secrets-in-code",
  "commit-format",
  "pr-size",
  "test-naming",
  "test-one-assertion",
  "test-flake-tolerance",
  "input-validation",
];

describe("recommendRules universal pack", () => {
  it("should always include the universal pack", () => {
    const ids = recommendRules(blankFingerprint({})).map((r) => r.id);
    expect(UNIVERSAL_IDS.every((id) => ids.includes(id))).toBe(true);
  });
});

describe("recommendRules language packs", () => {
  it("should include the typescript pack when primary language is typescript", () => {
    const ids = recommendRules(blankFingerprint({ primaryLanguage: "typescript" })).map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "ts-strict-typing",
        "ts-file-length",
        "ts-async-error-handling",
        "js-async-await",
      ]),
    );
  });

  it("should include the python pack when primary language is python", () => {
    const ids = recommendRules(blankFingerprint({ primaryLanguage: "python" })).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["py-type-hints", "py-format-black"]));
  });

  it("should include the go pack when primary language is go", () => {
    const ids = recommendRules(blankFingerprint({ primaryLanguage: "go" })).map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining(["go-error-return-checked", "go-no-panic", "go-context-cancel"]),
    );
  });

  it("should include the rust pack when primary language is rust", () => {
    const ids = recommendRules(blankFingerprint({ primaryLanguage: "rust" })).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["rust-no-unwrap", "rust-prefer-result"]));
  });
});

describe("recommendRules feature signals", () => {
  it("should include pytest-specific rules when pytest is detected", () => {
    const ids = recommendRules(
      blankFingerprint({ primaryLanguage: "python", testFrameworks: ["pytest"] }),
    ).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["pytest-fixtures", "pytest-parametrize"]));
  });

  it("should include db rules when hasDatabase is true", () => {
    const ids = recommendRules(blankFingerprint({ hasDatabase: true })).map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining(["parameterized-sql", "db-utc-timestamps", "db-money-as-cents"]),
    );
  });

  it("should include frontend rules when hasFrontend is true", () => {
    const ids = recommendRules(blankFingerprint({ hasFrontend: true })).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["a11y-wcag-level", "semantic-html"]));
  });
});

describe("recommendRules without language signal", () => {
  it("should yield only universals when no primary language is detected", () => {
    const ids = recommendRules(blankFingerprint({})).map((r) => r.id);
    expect(ids.sort()).toEqual([...UNIVERSAL_IDS].sort());
  });
});
