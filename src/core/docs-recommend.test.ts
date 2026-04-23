import { describe, expect, it } from "vitest";
import { recommendSetup } from "./recommend.js";
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

describe("recommendSetup docs skill and technical-writer agent", () => {
  it("should always recommend the docs skill regardless of stack", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.skills.find((s) => s.name === "docs")).toBeDefined();
    expect(plan.skippedSkills.find((s) => s.name === "docs")).toBeUndefined();
  });

  it("should always recommend the technical-writer agent regardless of stack", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.agents.find((a) => a.name === "technical-writer")).toBeDefined();
    expect(plan.skippedAgents.find((a) => a.name === "technical-writer")).toBeUndefined();
  });

  it("should mark the technical-writer agent at medium confidence", () => {
    const plan = recommendSetup(blankFingerprint({}));
    const writer = plan.agents.find((a) => a.name === "technical-writer");
    expect(writer?.confidence).toBe("medium");
  });
});
