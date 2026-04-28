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

describe("recommendSetup architect agent", () => {
  it("should always recommend the architect agent regardless of stack", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.agents.find((a) => a.name === "architect")).toBeDefined();
    expect(plan.skippedAgents.find((a) => a.name === "architect")).toBeUndefined();
  });

  it("should mark the architect agent at medium confidence", () => {
    const plan = recommendSetup(blankFingerprint({}));
    const architect = plan.agents.find((a) => a.name === "architect");
    expect(architect?.confidence).toBe("medium");
  });
});

describe("recommendSetup ui-designer agent (renamed from designer)", () => {
  it("should recommend ui-designer when frontend is detected", () => {
    const plan = recommendSetup(blankFingerprint({ hasFrontend: true, frameworks: ["react"] }));
    expect(plan.agents.find((a) => a.name === "ui-designer")).toBeDefined();
    expect(plan.agents.find((a) => a.name === "designer")).toBeUndefined();
  });

  it("should skip ui-designer when no frontend is detected", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.agents.find((a) => a.name === "ui-designer")).toBeUndefined();
    expect(plan.skippedAgents.find((a) => a.name === "ui-designer")).toBeDefined();
  });

  it("should never expose the legacy designer name in the plan", () => {
    const planFront = recommendSetup(blankFingerprint({ hasFrontend: true, frameworks: ["react"] }));
    const planNoFront = recommendSetup(blankFingerprint({}));
    expect(planFront.agents.find((a) => a.name === "designer")).toBeUndefined();
    expect(planFront.skippedAgents.find((a) => a.name === "designer")).toBeUndefined();
    expect(planNoFront.agents.find((a) => a.name === "designer")).toBeUndefined();
    expect(planNoFront.skippedAgents.find((a) => a.name === "designer")).toBeUndefined();
  });
});
