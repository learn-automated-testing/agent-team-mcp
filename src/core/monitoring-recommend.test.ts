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

describe("recommendSetup monitoring skill and agent", () => {
  it("should always recommend the monitoring skill regardless of stack", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.skills.find((s) => s.name === "monitoring")).toBeDefined();
    expect(plan.skippedSkills.find((s) => s.name === "monitoring")).toBeUndefined();
  });

  it("should always recommend the monitoring agent regardless of stack", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.agents.find((a) => a.name === "monitoring")).toBeDefined();
    expect(plan.skippedAgents.find((a) => a.name === "monitoring")).toBeUndefined();
  });

  it("should mark the monitoring agent at medium confidence", () => {
    const plan = recommendSetup(blankFingerprint({}));
    const monitoring = plan.agents.find((a) => a.name === "monitoring");
    expect(monitoring?.confidence).toBe("medium");
  });

  it("should mark the monitoring skill as a skill not a workflow", () => {
    const plan = recommendSetup(blankFingerprint({}));
    const monitoring = plan.skills.find((s) => s.name === "monitoring");
    expect(monitoring?.kind).toBe("skill");
  });
});
