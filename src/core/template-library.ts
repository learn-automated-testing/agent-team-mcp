import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { addRule, type AddRuleResult } from "./rules.js";

const here = dirname(fileURLToPath(import.meta.url));
const LIBRARY_PATH = join(here, "..", "..", "templates", "rule-library.json");

export interface TemplateQuestion {
  id: string;
  prompt: string;
  type: "choice" | "string";
  choices?: string[];
  default?: string;
}

export interface RuleTemplate {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description: string;
  defaultPaths: string[];
  questions: TemplateQuestion[];
  rules: string[];
  reason?: string;
  goodExample?: { code: string; language?: string };
  badExample?: { code: string; language?: string };
}

let cached: RuleTemplate[] | null = null;

export async function loadRuleLibrary(): Promise<RuleTemplate[]> {
  if (cached) return cached;
  const raw = await readFile(LIBRARY_PATH, "utf8");
  cached = JSON.parse(raw) as RuleTemplate[];
  return cached;
}

export async function findTemplate(id: string): Promise<RuleTemplate | null> {
  const lib = await loadRuleLibrary();
  return lib.find((t) => t.id === id) ?? null;
}

export async function listRuleTemplatesLogic(filter?: { category?: string; tag?: string }): Promise<RuleTemplate[]> {
  const lib = await loadRuleLibrary();
  return lib.filter((t) => {
    if (filter?.category && t.category !== filter.category) return false;
    if (filter?.tag && !t.tags.includes(filter.tag)) return false;
    return true;
  });
}

function applyDefaults(template: RuleTemplate, answers: Record<string, string>): Record<string, string> {
  const filled: Record<string, string> = { ...answers };
  for (const q of template.questions) {
    if (filled[q.id] === undefined || filled[q.id] === "") {
      if (q.default !== undefined) filled[q.id] = q.default;
    }
  }
  return filled;
}

function validateAnswers(template: RuleTemplate, answers: Record<string, string>): void {
  for (const q of template.questions) {
    const val = answers[q.id];
    if (val === undefined || val === "") {
      if (q.default === undefined) {
        throw new Error(`Missing required answer for question '${q.id}' (${q.prompt})`);
      }
      continue;
    }
    if (q.type === "choice" && q.choices && !q.choices.includes(val)) {
      throw new Error(`Answer for '${q.id}' must be one of: ${q.choices.join(", ")} (got '${val}')`);
    }
  }
}

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export interface InstallFromTemplateInput {
  projectDir: string;
  templateId: string;
  answers?: Record<string, string>;
  overrides?: {
    name?: string;
    paths?: string[];
    title?: string;
  };
  overwrite?: boolean;
}

export interface InstallFromTemplateResult {
  templateId: string;
  answersUsed: Record<string, string>;
  addRuleResult: AddRuleResult;
}

export async function installRuleFromTemplate(input: InstallFromTemplateInput): Promise<InstallFromTemplateResult> {
  const template = await findTemplate(input.templateId);
  if (!template) throw new Error(`Unknown template id: '${input.templateId}'`);

  const answers = applyDefaults(template, input.answers ?? {});
  validateAnswers(template, answers);

  const renderedRules = template.rules.map((r) => substitute(r, answers));
  const name = input.overrides?.name ?? template.id;
  const paths = input.overrides?.paths ?? template.defaultPaths;
  const title = input.overrides?.title ?? template.title;

  const addRuleResult = await addRule({
    projectDir: input.projectDir,
    name,
    paths: paths.length > 0 ? paths : undefined,
    title,
    rules: renderedRules,
    reason: template.reason,
    goodExample: template.goodExample,
    badExample: template.badExample,
    overwrite: input.overwrite,
  });

  return { templateId: template.id, answersUsed: answers, addRuleResult };
}
