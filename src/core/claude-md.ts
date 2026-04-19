import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Answers, Fingerprint, SetupPlan } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(here, "..", "..", "templates", "CLAUDE.md.tmpl");

export async function renderClaudeMd(
  fp: Fingerprint,
  plan: SetupPlan,
  answers: Answers,
): Promise<string> {
  const tmpl = await readFile(TEMPLATE_PATH, "utf8");

  const agentsList = plan.agents.length
    ? plan.agents.map((a) => `- \`${a.name}\` — ${a.reason}`).join("\n")
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

  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `(unknown: ${k})`);
}
