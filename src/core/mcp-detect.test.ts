import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectInstalledMcps } from "./mcp-detect.js";
import { recommendSetup } from "./recommend.js";
import { stackSection } from "./stack-section.js";
import type { Fingerprint } from "./types.js";

// TODO: detectInstalledMcps reads ~/.claude.json directly with no override hook,
// so the user-config branch cannot be isolated in tests without monkey-patching
// homedir(). These tests cover only the project-local .mcp.json branch.

describe("detectInstalledMcps (US-001 detect-installed-mcps)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-mcpdetect-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should surface server names from project-local .mcp.json", async () => {
    writeFileSync(
      join(dir, ".mcp.json"),
      JSON.stringify({ mcpServers: { "my-project-mcp": { command: "node", args: ["x.js"] } } }),
      "utf8",
    );
    const names = await detectInstalledMcps(dir);
    expect(names).toContain("my-project-mcp");
  });

  it("should not throw when neither .mcp.json nor user config has entries", async () => {
    // No .mcp.json written; result may include user-level MCPs but must not throw.
    const names = await detectInstalledMcps(dir);
    expect(Array.isArray(names)).toBe(true);
  });

  it("should sort the returned names", async () => {
    writeFileSync(
      join(dir, ".mcp.json"),
      JSON.stringify({ mcpServers: { zeta: {}, alpha: {}, mike: {} } }),
      "utf8",
    );
    const names = await detectInstalledMcps(dir);
    const projectIndices = ["alpha", "mike", "zeta"].map((n) => names.indexOf(n));
    expect(projectIndices[0]).toBeLessThan(projectIndices[1]);
    expect(projectIndices[1]).toBeLessThan(projectIndices[2]);
  });

  it("should return server names only — never the value object that contains tokens", async () => {
    writeFileSync(
      join(dir, ".mcp.json"),
      JSON.stringify({ mcpServers: { secret: { env: { API_KEY: "sk-leak-me" } } } }),
      "utf8",
    );
    const names = await detectInstalledMcps(dir);
    for (const n of names) expect(n).not.toContain("sk-leak-me");
    expect(names).toContain("secret");
  });

  it("should tolerate a malformed .mcp.json by treating it as missing", async () => {
    writeFileSync(join(dir, ".mcp.json"), "{ not json", "utf8");
    const names = await detectInstalledMcps(dir);
    expect(Array.isArray(names)).toBe(true);
  });
});

function fpWith(mcps: string[]): Fingerprint {
  return {
    projectDir: "/tmp/x",
    projectName: "demo",
    languages: { typescript: 100 },
    primaryLanguage: "typescript",
    packageManagers: ["npm"],
    frameworks: [],
    testFrameworks: [],
    ci: [],
    deployTargets: [],
    iacTools: [],
    hasFrontend: false,
    hasDatabase: false,
    mobilePlatforms: [],
    installedMcps: mcps,
    docs: { readme: null, contributing: null, docsDir: null },
    existingAgents: [],
    existingSkills: [],
    git: null,
  };
}

describe("stackSection MCPs line (US-002)", () => {
  it("should include 'Available MCPs:' when installedMcps is non-empty", () => {
    const out = stackSection(fpWith(["selenium-mcp", "playwright-mcp"]), {});
    expect(out).toContain("Available MCPs:");
    expect(out).toContain("selenium-mcp");
    expect(out).toContain("playwright-mcp");
  });

  it("should omit the 'Available MCPs:' line when installedMcps is empty", () => {
    const out = stackSection(fpWith([]), {});
    expect(out).not.toContain("Available MCPs:");
  });
});

describe("recommendSetup MCP confidence upgrade (US-003)", () => {
  it("should upgrade qa from medium to high when selenium-mcp is installed", () => {
    const plan = recommendSetup(fpWith(["selenium-mcp"]));
    const qa = plan.agents.find((a) => a.name === "qa");
    // TODO(prd): EPIC-008 US-003 says recommend.ts should consult a table-driven
    // mapping from MCP name to confidence upgrade (selenium-mcp → qa: high).
    // The current recommend.ts has no such mapping, so qa stays at "medium".
    // Leaving the failing assertion in to surface the implementation gap.
    expect(qa?.confidence).toBe("high");
  });

  it("should preserve baseline confidence when no relevant MCP is present", () => {
    const plan = recommendSetup(fpWith([]));
    const qa = plan.agents.find((a) => a.name === "qa");
    // Baseline qa confidence with no test framework: "medium".
    expect(qa?.confidence).toBe("medium");
  });
});
