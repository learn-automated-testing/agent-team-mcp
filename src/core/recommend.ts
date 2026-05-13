import { recommendRules } from "./recommend-rules.js";
import type { Fingerprint, OpenQuestion, PlannedAgent, PlannedSkill, SetupPlan } from "./types.js";

export { recommendRules } from "./recommend-rules.js";

export function recommendSetup(fp: Fingerprint): SetupPlan {
  const agents: PlannedAgent[] = [];
  const skills: PlannedSkill[] = [];
  const skippedAgents: SetupPlan["skippedAgents"] = [];
  const skippedSkills: SetupPlan["skippedSkills"] = [];
  const openQuestions: OpenQuestion[] = [];

  // Agents
  agents.push({
    name: "product-owner",
    reason: "Every project needs someone to turn ideas into specs and guard against building the wrong thing.",
    confidence: "high",
  });
  agents.push({
    name: "business-analyst",
    reason: "Every non-trivial project benefits from explicit process mapping and domain validation.",
    confidence: "high",
  });
  agents.push({
    name: "developer",
    reason: `Primary language detected: ${fp.primaryLanguage ?? "unknown"}.`,
    confidence: fp.primaryLanguage ? "high" : "medium",
  });
  agents.push({
    name: "qa",
    reason: fp.testFrameworks.length > 0
      ? `Test framework detected: ${fp.testFrameworks.join(", ")}.`
      : "No test framework detected, but every project needs a QA discipline.",
    confidence: fp.testFrameworks.length > 0 ? "high" : "medium",
  });
  agents.push({
    name: "technical-writer",
    reason: "Every project benefits from a dedicated docs perspective — README, ADRs, changelog, release notes. Invoked for coherent docs passes rather than inline edits.",
    confidence: "medium",
  });
  agents.push({
    name: "monitoring",
    reason: "Every project that runs in production needs a dedicated observability perspective — SLOs, dashboards, alert hygiene, incident triage.",
    confidence: "medium",
  });
  agents.push({
    name: "architect",
    reason: "Every project benefits from explicit system-design ownership — ADRs, technology choice, module boundaries, NFRs — before code is written.",
    confidence: "medium",
  });

  if (fp.hasFrontend) {
    agents.push({
      name: "ux-designer",
      reason: `Frontend detected (${fp.frameworks.filter((f) => ["react", "next", "vue", "svelte"].includes(f)).join(", ") || "JSX/TSX components"}).`,
      confidence: "high",
    });
    agents.push({
      name: "ui-designer",
      reason: "Frontend detected — dedicated UI/design system work is valuable.",
      confidence: "high",
    });
  } else {
    skippedAgents.push({ name: "ux-designer", reason: "No frontend framework or JSX components detected." });
    skippedAgents.push({ name: "ui-designer", reason: "No frontend framework or JSX components detected." });
  }

  if (fp.mobilePlatforms.length > 0) {
    agents.push({
      name: "mobile-developer",
      reason: `Mobile platform detected: ${fp.mobilePlatforms.join(", ")}.`,
      confidence: "high",
    });
  } else {
    skippedAgents.push({
      name: "mobile-developer",
      reason: "No iOS/Android/React Native/Flutter/Expo signals detected.",
    });
  }

  const hasDeploySignals = fp.deployTargets.length > 0 || fp.iacTools.length > 0 || fp.ci.length > 0;
  if (hasDeploySignals) {
    agents.push({
      name: "devops",
      reason: `Deploy signals detected: ${[...fp.deployTargets, ...fp.iacTools, ...fp.ci].join(", ")}.`,
      confidence: "high",
    });
  } else {
    skippedAgents.push({
      name: "devops",
      reason: "No Dockerfile, IaC, or CI workflows detected — add when deployment path is in place.",
    });
  }

  // Skills
  skills.push({ name: "prd", kind: "skill", reason: "Universal — every feature starts from a PRD (top of the spec hierarchy).", confidence: "high" });
  skills.push({ name: "epic", kind: "skill", reason: "Universal — decomposes a confirmed PRD into coherent slices of work.", confidence: "high" });
  skills.push({ name: "user-story", kind: "skill", reason: "Universal — turns each epic into buildable stories with explicit acceptance criteria.", confidence: "high" });
  skills.push({ name: "review", kind: "skill", reason: "Universal — every change benefits from structured review.", confidence: "high" });
  skills.push({ name: "debug", kind: "skill", reason: "Universal — every codebase has bugs.", confidence: "high" });
  skills.push({ name: "docs", kind: "skill", reason: "Universal — public API / config / behaviour changes need matching doc updates; ADRs, changelog, release notes.", confidence: "high" });
  skills.push({ name: "monitoring", kind: "skill", reason: "Universal — every shipped feature needs SLOs, signals, and runbook-backed alerts before it serves real users.", confidence: "medium" });
  skills.push({
    name: "test",
    kind: "skill",
    reason: fp.testFrameworks.length > 0
      ? `Test framework detected: ${fp.testFrameworks.join(", ")}.`
      : "No test framework detected yet — install this skill to define the testing approach.",
    confidence: fp.testFrameworks.length > 0 ? "high" : "medium",
  });
  skills.push({
    name: "scaffold",
    kind: "skill",
    reason: "Useful for bootstrapping new modules or features with consistent structure.",
    confidence: "medium",
  });

  if (fp.hasDatabase) {
    skills.push({ name: "db", kind: "skill", reason: "Database dependency detected (ORM or driver).", confidence: "high" });
  } else {
    skippedSkills.push({ name: "db", reason: "No database ORM or driver detected in dependencies." });
  }

  if (fp.hasFrontend) {
    skills.push({ name: "design", kind: "skill", reason: "Frontend detected — UI component work benefits from a codified design approach.", confidence: "high" });
  } else {
    skippedSkills.push({ name: "design", reason: "No frontend framework or JSX components detected." });
  }

  if (hasDeploySignals) {
    skills.push({
      name: "deploy",
      kind: "skill",
      reason: `Deploy signals detected: ${[...fp.deployTargets, ...fp.iacTools, ...fp.ci].join(", ")}.`,
      confidence: "high",
    });
  } else {
    skippedSkills.push({ name: "deploy", reason: "No deployment configuration detected." });
  }

  if (fp.iacTools.length > 0) {
    skills.push({
      name: "iac",
      kind: "skill",
      reason: `IaC tooling detected: ${fp.iacTools.join(", ")}. Provisioning has its own plan/apply discipline.`,
      confidence: "high",
    });
  } else {
    skippedSkills.push({
      name: "iac",
      reason: "No infrastructure-as-code files detected (.tf, Pulumi.yaml, .bicep, cdk.json).",
    });
  }

  if (fp.mobilePlatforms.length > 0) {
    skills.push({
      name: "mobile-release",
      kind: "skill",
      reason: `Mobile platform detected: ${fp.mobilePlatforms.join(", ")}. Store submission has its own workflow.`,
      confidence: "high",
    });
  } else {
    skippedSkills.push({
      name: "mobile-release",
      reason: "No mobile platform detected — install when adding an iOS/Android/RN/Flutter client.",
    });
  }

  // Workflows
  skills.push({ name: "new-app", kind: "workflow", reason: "For greenfield projects started from this repo.", confidence: "medium" });
  skills.push({ name: "new-feature", kind: "workflow", reason: "Standard feature lifecycle — useful for every active project.", confidence: "high" });
  skills.push({ name: "bug-fix", kind: "workflow", reason: "Standard bug fix pipeline.", confidence: "high" });
  skills.push({ name: "hotfix", kind: "workflow", reason: "Emergency production fix pipeline.", confidence: "medium" });

  // Open questions — minimal, only what the fingerprint can't tell us
  openQuestions.push({
    id: "target_tooling",
    prompt:
      "Which AI coding tool(s) should this setup target? 'both' writes the .claude/ tree plus a Copilot bridge under .github/. 'claude' writes only .claude/. 'copilot' writes only .github/.",
    optional: true,
    choices: ["both", "claude", "copilot"],
    default: "both",
  });
  openQuestions.push({
    id: "primary_user",
    prompt: "Who are the primary users of this project?",
    optional: false,
  });
  openQuestions.push({
    id: "domain",
    prompt: "What is the problem domain this project addresses?",
    optional: false,
  });
  openQuestions.push({
    id: "style_guide",
    prompt: "Code style guide reference (URL or repo path)",
    optional: true,
  });
  if (fp.testFrameworks.length === 0) {
    openQuestions.push({
      id: "preferred_test",
      prompt: "Preferred test framework (none detected)",
      optional: true,
      choices: ["vitest", "jest", "pytest", "go-test", "mocha", "other", "none-yet"],
    });
  }
  if (!hasDeploySignals) {
    openQuestions.push({
      id: "preferred_deploy",
      prompt: "Preferred deploy target (none detected)",
      optional: true,
      choices: ["vercel", "railway", "fly", "docker", "kubernetes", "other", "none-yet"],
    });
  }

  const rules = recommendRules(fp);

  return {
    projectName: fp.projectName,
    agents,
    skills,
    rules,
    skippedAgents,
    skippedSkills,
    skippedRules: [],
    openQuestions,
  };
}
