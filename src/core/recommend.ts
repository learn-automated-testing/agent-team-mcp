import type { Fingerprint, OpenQuestion, PlannedAgent, PlannedSkill, SetupPlan } from "./types.js";

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

  if (fp.hasFrontend) {
    agents.push({
      name: "ux-designer",
      reason: `Frontend detected (${fp.frameworks.filter((f) => ["react", "next", "vue", "svelte"].includes(f)).join(", ") || "JSX/TSX components"}).`,
      confidence: "high",
    });
    agents.push({
      name: "designer",
      reason: "Frontend detected — dedicated UI/design system work is valuable.",
      confidence: "high",
    });
  } else {
    skippedAgents.push({ name: "ux-designer", reason: "No frontend framework or JSX components detected." });
    skippedAgents.push({ name: "designer", reason: "No frontend framework or JSX components detected." });
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
  skills.push({ name: "prd", kind: "skill", reason: "Universal — every feature starts from a spec.", confidence: "high" });
  skills.push({ name: "review", kind: "skill", reason: "Universal — every change benefits from structured review.", confidence: "high" });
  skills.push({ name: "debug", kind: "skill", reason: "Universal — every codebase has bugs.", confidence: "high" });
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

  // Workflows
  skills.push({ name: "new-app", kind: "workflow", reason: "For greenfield projects started from this repo.", confidence: "medium" });
  skills.push({ name: "new-feature", kind: "workflow", reason: "Standard feature lifecycle — useful for every active project.", confidence: "high" });
  skills.push({ name: "bug-fix", kind: "workflow", reason: "Standard bug fix pipeline.", confidence: "high" });
  skills.push({ name: "hotfix", kind: "workflow", reason: "Emergency production fix pipeline.", confidence: "medium" });

  // Open questions — minimal, only what the fingerprint can't tell us
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

  return {
    projectName: fp.projectName,
    agents,
    skills,
    skippedAgents,
    skippedSkills,
    openQuestions,
  };
}
