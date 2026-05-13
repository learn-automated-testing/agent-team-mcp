import type { Answers, Fingerprint, SetupPlan, TargetTooling } from "./types.js";

export function resolveTargetTooling(answers: Answers): TargetTooling {
  const v = answers.target_tooling;
  if (v === "claude" || v === "copilot" || v === "both") return v;
  return "both";
}

export function shouldWriteClaudeTree(target: TargetTooling): boolean {
  return target === "claude" || target === "both";
}

export function shouldWriteCopilotBridge(target: TargetTooling): boolean {
  return target === "copilot" || target === "both";
}

export function shouldWriteCopilotStandalone(target: TargetTooling): boolean {
  return target === "copilot";
}

const PATH_REWRITES: Array<readonly [RegExp, string]> = [
  [/\.claude\/skills\//g, ".github/skills/"],
  [/\.claude\/agents\//g, ".github/agents/"],
  [/\.claude\/rules\//g, ".github/instructions/"],
  [/\.claude\/context\.md/g, ".github/context.md"],
];

export function rewriteClaudePaths(body: string): string {
  let out = body;
  for (const [re, sub] of PATH_REWRITES) out = out.replace(re, sub);
  return out;
}

export function rewriteAgentForCopilot(body: string): string {
  const rewritten = rewriteClaudePaths(body);
  return rewritten.replace(/^---\n([\s\S]*?)\n---\n/, (_, fm: string) => {
    const lines = fm.split("\n").filter((l) => !l.trim().startsWith("isolation:"));
    return `---\n${lines.join("\n")}\n---\n`;
  });
}

function renderListLine(name: string, reason: string): string {
  return `- \`${name}\` — ${reason}`;
}

export function renderCopilotInstructions(
  template: string,
  fp: Fingerprint,
  plan: SetupPlan,
  answers: Answers,
): string {
  const agentsList = plan.agents.length
    ? plan.agents.map((a) => renderListLine(a.name, a.reason)).join("\n")
    : "- (none)";

  const skillsList = plan.skills.length
    ? plan.skills.map((s) => `- \`${s.name}\` (${s.kind}) — ${s.reason}`).join("\n")
    : "- (none)";

  const vars: Record<string, string> = {
    projectName: fp.projectName,
    primaryLanguage: fp.primaryLanguage ?? "(unknown)",
    frameworks: fp.frameworks.join(", ") || "(none detected)",
    testFrameworks: fp.testFrameworks.join(", ") || answers.preferred_test || "(none)",
    deployTargets: fp.deployTargets.join(", ") || answers.preferred_deploy || "(none)",
    primaryUser: answers.primary_user ?? "(not specified)",
    domain: answers.domain ?? "(not specified)",
    styleGuide: answers.style_guide ?? "(not specified)",
    agentsList,
    skillsList,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `(unknown: ${k})`);
}

export function renderInstructionFile(template: string, answers: Answers, fp: Fingerprint): string {
  const vars: Record<string, string> = {
    styleGuide: answers.style_guide ?? "(not specified)",
    testFrameworks: fp.testFrameworks.join(", ") || answers.preferred_test || "(none)",
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `(unknown: ${k})`);
}

export function selectInstructionFiles(fp: Fingerprint, all: string[]): string[] {
  return all.filter((name) => {
    if (name === "typescript") {
      return fp.primaryLanguage === "typescript" || (fp.languages.typescript ?? 0) > 0;
    }
    return true;
  });
}
