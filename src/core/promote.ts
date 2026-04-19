import { captureLesson, type CaptureLessonResult } from "./lessons.js";
import { addRule, type AddRuleResult } from "./rules.js";
import type { LessonCategory } from "./types.js";

export interface PromoteAsRuleInput {
  projectDir: string;
  name: string;
  title: string;
  rules: string | string[];
  paths?: string[];
  reason?: string;
  goodExample?: { code: string; language?: string };
  badExample?: { code: string; language?: string };
  overwrite?: boolean;
}

export interface PromoteAsLessonInput {
  projectDir: string;
  category: LessonCategory;
  lesson: string;
  reason: string;
}

export async function promoteAsRule(input: PromoteAsRuleInput): Promise<AddRuleResult> {
  return addRule(input);
}

export async function promoteAsLesson(input: PromoteAsLessonInput): Promise<CaptureLessonResult> {
  return captureLesson(input);
}
