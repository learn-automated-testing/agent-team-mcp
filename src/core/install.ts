import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { renderClaudeMd } from "./claude-md.js";
import {
  renderCopilotInstructions,
  renderInstructionFile,
  resolveTargetTooling,
  rewriteAgentForCopilot,
  rewriteClaudePaths,
  selectInstructionFiles,
  shouldWriteClaudeTree,
  shouldWriteCopilotBridge,
  shouldWriteCopilotStandalone,
} from "./copilot-render.js";
import { inspectProject } from "./inspect.js";
import { installHooks, type HookInstallReport } from "./install-hooks.js";
import { installPlannedRules } from "./install-rules.js";
import { recommendSetup } from "./recommend.js";
import { injectStackSection, stackSection } from "./stack-section.js";
import {
  listInstructionTemplates,
  listRequirementsTemplates,
  listSkillReferenceFiles,
  readAgentTemplate,
  readContextTemplate,
  readCopilotInstructionsTemplate,
  readInstructionTemplate,
  readRequirementsTemplate,
  readSkillReferenceFile,
  readSkillTemplate,
  readWorkflowTemplate,
} from "./templates.js";
import type { Answers, Fingerprint, SetupPlan, SkillsrepoMetadata, TargetTooling } from "./types.js";

const METADATA_VERSION = "0.4.0";

export interface InstallOptions {
  outDir: string;
  overwrite: boolean;
  answers: Answers;
  hooks: boolean;
}

export type InstalledKind =
  | "agent"
  | "skill"
  | "workflow"
  | "rule"
  | "context"
  | "state"
  | "meta"
  | "claude-md"
  | "rules-dir"
  | "skill-references"
  | "skill-examples"
  | "requirements-template"
  | "copilot-instructions"
  | "copilot-instruction-file"
  | "copilot-agent"
  | "copilot-skill"
  | "copilot-workflow"
  | "copilot-context";

export interface InstallReport {
  projectName: string;
  outDir: string;
  target: TargetTooling;
  written: Array<{ kind: InstalledKind; name: string; path: string }>;
  skipped: Array<{ kind: InstalledKind; name: string; reason: string }>;
  rules: Array<{ id: string; path: string }>;
  answersUsed: Answers;
  missingAnswers: string[];
  hooks: HookInstallReport | null;
}

function agentPath(outDir: string, name: string): string {
  return resolve(outDir, ".claude", "agents", `${name}.md`);
}
function skillPath(outDir: string, name: string): string {
  return resolve(outDir, ".claude", "skills", name, "SKILL.md");
}
function contextPath(outDir: string): string {
  return resolve(outDir, ".claude", "context.md");
}
function statePath(outDir: string): string {
  return resolve(outDir, ".claude", "state.json");
}
export function metadataPath(outDir: string): string {
  return resolve(outDir, ".claude", ".skillsrepo.json");
}

function renderContext(tmpl: string, fp: Fingerprint, answers: Answers): string {
  const vars: Record<string, string> = {
    projectName: fp.projectName,
    primaryLanguage: fp.primaryLanguage ?? "unknown",
    packageManagers: fp.packageManagers.join(", ") || "(none detected)",
    frameworks: fp.frameworks.join(", ") || "(none detected)",
    testFrameworks: fp.testFrameworks.join(", ") || answers.preferred_test || "(none detected)",
    ci: fp.ci.join(", ") || "(none detected)",
    deployTargets: fp.deployTargets.join(", ") || answers.preferred_deploy || "(none detected)",
    iacTools: fp.iacTools.join(", ") || "(none detected)",
    hasFrontend: String(fp.hasFrontend),
    readme: fp.docs.readme ?? "(none)",
    contributing: fp.docs.contributing ?? "(none)",
    docsDir: fp.docs.docsDir ?? "(none)",
    primaryUser: answers.primary_user ?? "(not yet specified — ask the user)",
    domain: answers.domain ?? "(not yet specified — ask the user)",
    styleGuide: answers.style_guide ?? "(not specified)",
  };
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `(unknown: ${k})`);
}

function initialState(projectName: string): string {
  return JSON.stringify(
    {
      project: projectName,
      status: "idle",
      current_step: null,
      workflow: null,
      feature: null,
      completed: [],
      skipped: [],
      started_at: null,
      updated_at: new Date().toISOString(),
      notes: [],
    },
    null,
    2,
  );
}

async function writeIfAllowed(
  path: string,
  contents: string,
  overwrite: boolean,
): Promise<{ written: boolean; reason?: string }> {
  if (!overwrite && existsSync(path)) {
    return { written: false, reason: `Already exists at ${path} (use overwrite=true to replace)` };
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return { written: true };
}

async function writeMetadata(
  outDir: string,
  plan: SetupPlan,
  answers: Answers,
): Promise<void> {
  const path = metadataPath(outDir);
  let existing: Partial<SkillsrepoMetadata> = {};
  if (existsSync(path)) {
    try { existing = JSON.parse(await readFile(path, "utf8")); } catch { /* ignore */ }
  }
  const meta: SkillsrepoMetadata = {
    version: METADATA_VERSION,
    installedAt: existing.installedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answers: { ...(existing.answers ?? {}), ...answers },
    agents: plan.agents.map((a) => a.name),
    skills: plan.skills.map((s) => ({ name: s.name, kind: s.kind })),
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(meta, null, 2), "utf8");
}

export async function readMetadata(outDir: string): Promise<SkillsrepoMetadata | null> {
  const path = metadataPath(outDir);
  if (!existsSync(path)) return null;
  try { return JSON.parse(await readFile(path, "utf8")) as SkillsrepoMetadata; } catch { return null; }
}

function missing(plan: SetupPlan, answers: Answers): string[] {
  return plan.openQuestions
    .filter((q) => !q.optional && !(answers[q.id] && answers[q.id].trim() !== ""))
    .map((q) => q.id);
}

export async function installSetup(
  plan: SetupPlan,
  fingerprint: Fingerprint,
  opts: InstallOptions,
): Promise<InstallReport> {
  const target = resolveTargetTooling(opts.answers);
  const report: InstallReport = {
    projectName: plan.projectName,
    outDir: opts.outDir,
    target,
    written: [],
    skipped: [],
    rules: [],
    answersUsed: opts.answers,
    missingAnswers: missing(plan, opts.answers),
    hooks: null,
  };

  const stack = stackSection(fingerprint, opts.answers);

  if (shouldWriteClaudeTree(target)) {
    await writeClaudeTree(plan, fingerprint, opts, stack, report);
  }

  if (shouldWriteCopilotBridge(target)) {
    await writeCopilotBridge(plan, fingerprint, opts, report, target);
  }

  if (shouldWriteCopilotStandalone(target)) {
    await writeCopilotStandalone(plan, fingerprint, opts, stack, report);
  }

  // State + metadata are MCP internals — always under .claude/, regardless of target.
  const sr = await writeIfAllowed(statePath(opts.outDir), initialState(plan.projectName), opts.overwrite);
  if (sr.written) report.written.push({ kind: "state", name: "state.json", path: statePath(opts.outDir) });
  else report.skipped.push({ kind: "state", name: "state.json", reason: sr.reason! });

  await writeMetadata(opts.outDir, plan, opts.answers);
  report.written.push({ kind: "meta", name: ".skillsrepo.json", path: metadataPath(opts.outDir) });

  if (opts.hooks && target !== "copilot") {
    report.hooks = await installHooks(opts.outDir);
  }

  return report;
}

async function writeClaudeTree(
  plan: SetupPlan,
  fingerprint: Fingerprint,
  opts: InstallOptions,
  stack: string,
  report: InstallReport,
): Promise<void> {
  for (const agent of plan.agents) {
    const tmpl = await readAgentTemplate(agent.name);
    const body = injectStackSection(tmpl, stack);
    const path = agentPath(opts.outDir, agent.name);
    const r = await writeIfAllowed(path, body, opts.overwrite);
    if (r.written) report.written.push({ kind: "agent", name: agent.name, path });
    else report.skipped.push({ kind: "agent", name: agent.name, reason: r.reason! });
  }

  for (const skill of plan.skills) {
    const tmpl = skill.kind === "workflow"
      ? await readWorkflowTemplate(skill.name)
      : await readSkillTemplate(skill.name);
    const body = injectStackSection(tmpl, stack);
    const path = skillPath(opts.outDir, skill.name);
    const r = await writeIfAllowed(path, body, opts.overwrite);
    if (r.written) report.written.push({ kind: skill.kind, name: skill.name, path });
    else report.skipped.push({ kind: skill.kind, name: skill.name, reason: r.reason! });

    const skillDir = resolve(opts.outDir, ".claude", "skills", skill.name);
    const refsDir = resolve(skillDir, "references");
    const examplesDir = resolve(skillDir, "examples");
    await mkdir(refsDir, { recursive: true });
    await mkdir(examplesDir, { recursive: true });
    report.written.push({ kind: "skill-references", name: `${skill.name}/references`, path: refsDir });
    report.written.push({ kind: "skill-examples", name: `${skill.name}/examples`, path: examplesDir });

    if (skill.kind === "skill") {
      const refFiles = await listSkillReferenceFiles(skill.name);
      for (const refFile of refFiles) {
        const refContents = await readSkillReferenceFile(skill.name, refFile);
        const refPath = resolve(refsDir, refFile);
        const rr = await writeIfAllowed(refPath, refContents, opts.overwrite);
        if (rr.written) report.written.push({ kind: "skill-references", name: `${skill.name}/references/${refFile}`, path: refPath });
        else report.skipped.push({ kind: "skill-references", name: `${skill.name}/references/${refFile}`, reason: rr.reason! });
      }
    }
  }

  const contextTmpl = await readContextTemplate();
  const contextBody = renderContext(contextTmpl, fingerprint, opts.answers);
  const cr = await writeIfAllowed(contextPath(opts.outDir), contextBody, opts.overwrite);
  if (cr.written) report.written.push({ kind: "context", name: "context.md", path: contextPath(opts.outDir) });
  else report.skipped.push({ kind: "context", name: "context.md", reason: cr.reason! });

  const claudeMdPath = resolve(opts.outDir, "CLAUDE.md");
  const claudeMdBody = await renderClaudeMd(fingerprint, plan, opts.answers);
  const cmr = await writeIfAllowed(claudeMdPath, claudeMdBody, opts.overwrite);
  if (cmr.written) report.written.push({ kind: "claude-md", name: "CLAUDE.md", path: claudeMdPath });
  else report.skipped.push({ kind: "claude-md", name: "CLAUDE.md", reason: cmr.reason! });

  const rulesDir = resolve(opts.outDir, ".claude", "rules");
  await mkdir(rulesDir, { recursive: true });
  report.written.push({ kind: "rules-dir", name: ".claude/rules/", path: rulesDir });

  await installPlannedRules(plan.rules, opts.outDir, opts.overwrite, report);

  await writeRequirementsTemplates(opts, report);
}

async function writeRequirementsTemplates(
  opts: InstallOptions,
  report: InstallReport,
): Promise<void> {
  const files = await listRequirementsTemplates();
  if (files.length === 0) return;
  const tmplDir = resolve(opts.outDir, ".claude", "templates", "requirements");
  await mkdir(tmplDir, { recursive: true });
  for (const file of files) {
    const contents = await readRequirementsTemplate(file);
    const path = resolve(tmplDir, file);
    const r = await writeIfAllowed(path, contents, opts.overwrite);
    if (r.written) report.written.push({ kind: "requirements-template", name: `.claude/templates/requirements/${file}`, path });
    else report.skipped.push({ kind: "requirements-template", name: `.claude/templates/requirements/${file}`, reason: r.reason! });
  }
}

async function writeCopilotBridge(
  plan: SetupPlan,
  fingerprint: Fingerprint,
  opts: InstallOptions,
  report: InstallReport,
  target: TargetTooling,
): Promise<void> {
  const standalone = target === "copilot";
  const tmpl = await readCopilotInstructionsTemplate(standalone);
  const body = renderCopilotInstructions(tmpl, fingerprint, plan, opts.answers);
  const path = resolve(opts.outDir, ".github", "copilot-instructions.md");
  const r = await writeIfAllowed(path, body, opts.overwrite);
  if (r.written) report.written.push({ kind: "copilot-instructions", name: "copilot-instructions.md", path });
  else report.skipped.push({ kind: "copilot-instructions", name: "copilot-instructions.md", reason: r.reason! });

  const all = await listInstructionTemplates();
  const selected = selectInstructionFiles(fingerprint, all);
  for (const name of selected) {
    const itmpl = await readInstructionTemplate(name);
    const ibody = renderInstructionFile(itmpl, opts.answers, fingerprint);
    const ipath = resolve(opts.outDir, ".github", "instructions", `${name}.instructions.md`);
    const ir = await writeIfAllowed(ipath, ibody, opts.overwrite);
    if (ir.written) report.written.push({ kind: "copilot-instruction-file", name, path: ipath });
    else report.skipped.push({ kind: "copilot-instruction-file", name, reason: ir.reason! });
  }
}

async function writeCopilotStandalone(
  plan: SetupPlan,
  fingerprint: Fingerprint,
  opts: InstallOptions,
  stack: string,
  report: InstallReport,
): Promise<void> {
  for (const agent of plan.agents) {
    const tmpl = await readAgentTemplate(agent.name);
    const withStack = injectStackSection(tmpl, stack);
    const body = rewriteAgentForCopilot(withStack);
    const path = resolve(opts.outDir, ".github", "agents", `${agent.name}.agent.md`);
    const r = await writeIfAllowed(path, body, opts.overwrite);
    if (r.written) report.written.push({ kind: "copilot-agent", name: agent.name, path });
    else report.skipped.push({ kind: "copilot-agent", name: agent.name, reason: r.reason! });
  }

  for (const skill of plan.skills) {
    const tmpl = skill.kind === "workflow"
      ? await readWorkflowTemplate(skill.name)
      : await readSkillTemplate(skill.name);
    const withStack = injectStackSection(tmpl, stack);
    const body = rewriteClaudePaths(withStack);
    const path = resolve(opts.outDir, ".github", "skills", skill.name, "SKILL.md");
    const r = await writeIfAllowed(path, body, opts.overwrite);
    const kind = skill.kind === "workflow" ? "copilot-workflow" : "copilot-skill";
    if (r.written) report.written.push({ kind, name: skill.name, path });
    else report.skipped.push({ kind, name: skill.name, reason: r.reason! });

    if (skill.kind === "skill") {
      const refFiles = await listSkillReferenceFiles(skill.name);
      for (const refFile of refFiles) {
        const refContents = await readSkillReferenceFile(skill.name, refFile);
        const refPath = resolve(opts.outDir, ".github", "skills", skill.name, "references", refFile);
        const rr = await writeIfAllowed(refPath, refContents, opts.overwrite);
        if (rr.written) report.written.push({ kind: "skill-references", name: `${skill.name}/references/${refFile}`, path: refPath });
        else report.skipped.push({ kind: "skill-references", name: `${skill.name}/references/${refFile}`, reason: rr.reason! });
      }
    }
  }

  const contextTmpl = await readContextTemplate();
  const contextBody = rewriteClaudePaths(renderContext(contextTmpl, fingerprint, opts.answers));
  const cpath = resolve(opts.outDir, ".github", "context.md");
  const cr = await writeIfAllowed(cpath, contextBody, opts.overwrite);
  if (cr.written) report.written.push({ kind: "copilot-context", name: "context.md", path: cpath });
  else report.skipped.push({ kind: "copilot-context", name: "context.md", reason: cr.reason! });

  await writeRequirementsTemplates(opts, report);
}

export async function installFromProjectDir(
  projectDir: string,
  opts: { outDir?: string; overwrite?: boolean; answers?: Answers; hooks?: boolean },
): Promise<InstallReport> {
  const fp = await inspectProject(projectDir);
  const plan = recommendSetup(fp);
  return installSetup(plan, fp, {
    outDir: opts.outDir ?? projectDir,
    overwrite: opts.overwrite ?? false,
    answers: opts.answers ?? {},
    hooks: opts.hooks ?? true,
  });
}
