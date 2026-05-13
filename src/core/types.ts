export interface Fingerprint {
  projectDir: string;
  projectName: string;
  languages: Record<string, number>;
  primaryLanguage: string | null;
  packageManagers: string[];
  frameworks: string[];
  testFrameworks: string[];
  ci: string[];
  deployTargets: string[];
  iacTools: string[];
  hasFrontend: boolean;
  hasDatabase: boolean;
  mobilePlatforms: string[];
  installedMcps: string[];
  docs: {
    readme: string | null;
    contributing: string | null;
    docsDir: string | null;
  };
  existingAgents: string[];
  existingSkills: string[];
  git: {
    contributors: number;
    lastCommit: string | null;
  } | null;
}

export type Confidence = "high" | "medium" | "low";

export interface PlannedAgent {
  name: string;
  reason: string;
  confidence: Confidence;
}

export interface PlannedSkill {
  name: string;
  kind: "skill" | "workflow";
  reason: string;
  confidence: Confidence;
}

export interface PlannedRule {
  id: string;
  reason: string;
  confidence: Confidence;
}

export interface OpenQuestion {
  id: string;
  prompt: string;
  optional: boolean;
  choices?: string[];
  default?: string;
}

export interface SetupPlan {
  projectName: string;
  agents: PlannedAgent[];
  skills: PlannedSkill[];
  rules: PlannedRule[];
  skippedAgents: Array<{ name: string; reason: string }>;
  skippedSkills: Array<{ name: string; reason: string }>;
  skippedRules: Array<{ id: string; reason: string }>;
  openQuestions: OpenQuestion[];
}

export type Answers = Record<string, string>;

export type TargetTooling = "claude" | "copilot" | "both";

export type LessonCategory = "code" | "process" | "tooling" | "domain";

export interface LessonEntry {
  category: LessonCategory;
  lesson: string;
  reason: string;
  capturedAt: string;
}

export interface SkillsrepoMetadata {
  version: string;
  installedAt: string;
  updatedAt: string;
  answers: Answers;
  agents: string[];
  skills: Array<{ name: string; kind: "skill" | "workflow" }>;
  lessons?: LessonEntry[];
}
