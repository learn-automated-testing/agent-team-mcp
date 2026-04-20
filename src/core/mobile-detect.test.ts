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

describe("inspectProject mobile detection", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-mobile-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should detect ios from a project.pbxproj file", async () => {
    mkdirSync(join(dir, "App.xcodeproj"), { recursive: true });
    writeFileSync(join(dir, "App.xcodeproj", "project.pbxproj"), "// fake pbx\n");
    const fp = await inspectProject(dir);
    expect(fp.mobilePlatforms).toContain("ios");
  });

  it("should detect android from an AndroidManifest.xml file", async () => {
    mkdirSync(join(dir, "app", "src", "main"), { recursive: true });
    writeFileSync(join(dir, "app", "src", "main", "AndroidManifest.xml"), "<manifest/>\n");
    const fp = await inspectProject(dir);
    expect(fp.mobilePlatforms).toContain("android");
  });

  it("should detect react-native from a package.json dependency", async () => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "rn-app", dependencies: { "react-native": "0.74.0" } }),
    );
    const fp = await inspectProject(dir);
    expect(fp.mobilePlatforms).toContain("react-native");
  });

  it("should detect flutter only when both pubspec.yaml and a .dart file are present", async () => {
    writeFileSync(join(dir, "pubspec.yaml"), "name: app\n");
    const without = await inspectProject(dir);
    expect(without.mobilePlatforms).not.toContain("flutter");

    mkdirSync(join(dir, "lib"), { recursive: true });
    writeFileSync(join(dir, "lib", "main.dart"), "void main() {}\n");
    const withDart = await inspectProject(dir);
    expect(withDart.mobilePlatforms).toContain("flutter");
  });

  it("should leave mobilePlatforms empty for a server-only project", async () => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "api", dependencies: { express: "^4.0.0" } }),
    );
    const fp = await inspectProject(dir);
    expect(fp.mobilePlatforms).toEqual([]);
  });
});

describe("recommendSetup with mobile platforms", () => {
  it("should recommend mobile-developer agent when a mobile platform is detected", () => {
    const plan = recommendSetup(blankFingerprint({ mobilePlatforms: ["ios"] }));
    expect(plan.agents.find((a) => a.name === "mobile-developer")).toBeDefined();
    expect(plan.skippedAgents.find((a) => a.name === "mobile-developer")).toBeUndefined();
  });

  it("should recommend the mobile-release skill when a mobile platform is detected", () => {
    const plan = recommendSetup(blankFingerprint({ mobilePlatforms: ["android"] }));
    expect(plan.skills.find((s) => s.name === "mobile-release")).toBeDefined();
  });

  it("should skip mobile-developer and mobile-release when no mobile platform is detected", () => {
    const plan = recommendSetup(blankFingerprint({}));
    expect(plan.agents.find((a) => a.name === "mobile-developer")).toBeUndefined();
    expect(plan.skippedAgents.find((a) => a.name === "mobile-developer")).toBeDefined();
    expect(plan.skippedSkills.find((s) => s.name === "mobile-release")).toBeDefined();
  });
});
