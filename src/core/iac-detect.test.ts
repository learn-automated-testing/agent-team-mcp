import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inspectProject } from "./inspect.js";
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

describe("inspectProject IaC detection", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-iac-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should detect terraform from a .tf file", async () => {
    writeFileSync(join(dir, "main.tf"), 'resource "aws_s3_bucket" "x" {}\n');
    const fp = await inspectProject(dir);
    expect(fp.iacTools).toContain("terraform");
  });

  it("should detect bicep from a .bicep file", async () => {
    writeFileSync(join(dir, "main.bicep"), "param location string = resourceGroup().location\n");
    const fp = await inspectProject(dir);
    expect(fp.iacTools).toContain("bicep");
  });

  it("should detect cdk from a cdk.json file", async () => {
    writeFileSync(join(dir, "cdk.json"), '{"app": "npx ts-node bin/app.ts"}\n');
    const fp = await inspectProject(dir);
    expect(fp.iacTools).toContain("cdk");
  });

  it("should detect pulumi from a Pulumi.yaml file", async () => {
    writeFileSync(join(dir, "Pulumi.yaml"), "name: my-stack\nruntime: nodejs\n");
    const fp = await inspectProject(dir);
    expect(fp.iacTools).toContain("pulumi");
  });

  it("should leave iacTools empty for a project with no IaC files", async () => {
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "index.ts"), "export const x = 1;\n");
    const fp = await inspectProject(dir);
    expect(fp.iacTools).toEqual([]);
  });
});

describe("recommendSetup with IaC tooling", () => {
  it("should recommend the iac skill when any IaC tool is detected", () => {
    const plan = recommendSetup(blankFingerprint({ iacTools: ["bicep"] }));
    expect(plan.skills.find((s) => s.name === "iac")).toBeDefined();
    expect(plan.skippedSkills.find((s) => s.name === "iac")).toBeUndefined();
  });

  it("should skip the iac skill when no IaC tool is detected", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.skills.find((s) => s.name === "iac")).toBeUndefined();
    expect(plan.skippedSkills.find((s) => s.name === "iac")).toBeDefined();
  });
});
