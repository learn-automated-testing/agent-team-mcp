import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installSetup } from "./install.js";
import { recommendSetup } from "./recommend.js";
import { refineItem } from "./refine.js";
import type { Answers, Fingerprint } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(here, "..", "..", "templates");
const SNIPPET_PATH = join(TEMPLATES_DIR, "snippets", "handoff-protocol.md");
const AGENTS_DIR = join(TEMPLATES_DIR, "agents");

function tsFingerprint(dir: string): Fingerprint {
  return {
    projectDir: dir,
    projectName: "demo",
    languages: { typescript: 100 },
    primaryLanguage: "typescript",
    packageManagers: ["npm"],
    frameworks: ["mcp"],
    testFrameworks: ["vitest"],
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
  };
}

async function runInstall(dir: string, answers: Answers) {
  const fp = tsFingerprint(dir);
  const plan = recommendSetup(fp);
  return installSetup(plan, fp, { outDir: dir, overwrite: false, answers, hooks: false });
}

describe("handoff snippet template (US-001 handoff-snippet)", () => {
  it("should exist at templates/snippets/handoff-protocol.md", () => {
    expect(existsSync(SNIPPET_PATH)).toBe(true);
  });

  it("should describe the Task tool invocation guidance for sub-agent handoff", async () => {
    const body = await readFile(SNIPPET_PATH, "utf8");
    expect(body).toContain("Task");
    expect(body).toContain("subagent_type");
  });

  it("should be referenced via {{snippet:handoff-protocol}} from the agent templates", () => {
    const agentFiles = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));
    const referenced = agentFiles.filter((f) => {
      const body = readFileSync(join(AGENTS_DIR, f), "utf8");
      return body.includes("{{snippet:handoff-protocol}}");
    });
    // At least the core handoff-chain agents should reference the snippet.
    expect(referenced.length).toBeGreaterThan(3);
  });
});

describe("state.json update precedes handoff (US-002)", () => {
  it("should pair state.json updates with each Task handoff in the snippet", async () => {
    const body = await readFile(SNIPPET_PATH, "utf8");
    expect(body).toContain(".claude/state.json");
    const stateIdx = body.indexOf(".claude/state.json");
    const taskIdx = body.indexOf("`Task` tool");
    expect(stateIdx).toBeGreaterThan(-1);
    expect(taskIdx).toBeGreaterThan(-1);
    // The state-update guidance must come before the Task invocation in the snippet.
    expect(stateIdx).toBeLessThan(taskIdx);
  });

  it("should ensure every agent template that mentions Task handoff also mentions state.json", () => {
    const agentFiles = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));
    const offenders: string[] = [];
    for (const f of agentFiles) {
      const body = readFileSync(join(AGENTS_DIR, f), "utf8");
      const mentionsHandoff = body.includes("{{snippet:handoff-protocol}}") || body.includes("Hand off");
      const mentionsState = body.includes("state.json") || body.includes("{{snippet:handoff-protocol}}");
      if (mentionsHandoff && !mentionsState) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

describe("refineItem({resyncBody: true}) re-applies snippet (US-003)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skillsrepo-handoff-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should restore the snippet content when resyncBody is true after a corruption", async () => {
    await runInstall(dir, { primary_user: "devs", domain: "x" });
    const agentPath = join(dir, ".claude", "agents", "developer.md");
    const original = await readFile(agentPath, "utf8");
    expect(original).toContain("Handoff protocol");
    // Corrupt the agent body — strip the handoff section entirely.
    const corrupted = original.replace(/## Handoff protocol[\s\S]*$/m, "## Handoff protocol\nCORRUPTED\n");
    await writeFile(agentPath, corrupted, "utf8");
    // Re-sync from the template.
    const report = await refineItem({ projectDir: dir, kind: "agent", name: "developer", resyncBody: true });
    expect(report.action).toBe("resynced-full-body");
    const after = await readFile(agentPath, "utf8");
    expect(after).not.toContain("CORRUPTED");
    // The current snippet content should be present again.
    const snippet = await readFile(SNIPPET_PATH, "utf8");
    const firstSnippetLine = snippet.split("\n").find((l) => l.startsWith("## ")) ?? "## Handoff protocol";
    expect(after).toContain(firstSnippetLine);
  });
});
