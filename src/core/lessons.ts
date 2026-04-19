import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { LessonCategory, LessonEntry, SkillsrepoMetadata } from "./types.js";

const LEARNED_HEADER = "## Learned conventions";

function metadataPath(projectDir: string): string {
  return resolve(projectDir, ".claude", ".skillsrepo.json");
}

function contextPath(projectDir: string): string {
  return resolve(projectDir, ".claude", "context.md");
}

export async function readMetadataForLessons(projectDir: string): Promise<SkillsrepoMetadata | null> {
  const path = metadataPath(projectDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as SkillsrepoMetadata;
  } catch {
    return null;
  }
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatBullet(entry: LessonEntry): string {
  return `- **[${entry.category}]** ${entry.lesson} — **Why:** ${entry.reason}`;
}

function addLessonToContext(body: string, bullet: string): string {
  const lines = body.split("\n");
  const headerIdx = lines.findIndex((l) => l.trim() === LEARNED_HEADER);

  if (headerIdx === -1) {
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    lines.push("", LEARNED_HEADER, "", bullet);
    return lines.join("\n") + "\n";
  }

  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      endIdx = i;
      break;
    }
  }

  let insertIdx = endIdx;
  while (insertIdx > headerIdx + 1 && lines[insertIdx - 1].trim() === "") insertIdx--;
  lines.splice(insertIdx, 0, bullet);
  return lines.join("\n");
}

export interface CaptureLessonInput {
  projectDir: string;
  category: LessonCategory;
  lesson: string;
  reason: string;
}

export interface CaptureLessonResult {
  saved: boolean;
  duplicate: boolean;
  contextPath: string;
  metadataPath: string;
  entry: LessonEntry | null;
  totalLessons: number;
}

export async function captureLesson(input: CaptureLessonInput): Promise<CaptureLessonResult> {
  if (!input.reason || input.reason.trim() === "") {
    throw new Error("'reason' is required — the point of a lesson is the WHY, not just the rule.");
  }
  if (!input.lesson || input.lesson.trim() === "") {
    throw new Error("'lesson' is required.");
  }

  const meta = await readMetadataForLessons(input.projectDir);
  if (!meta) {
    throw new Error(
      `No .claude/.skillsrepo.json found in ${input.projectDir}. Run install_setup first so the team is in place.`,
    );
  }

  const lessons = meta.lessons ?? [];
  const normalized = normalize(input.lesson);
  const existing = lessons.find((l) => normalize(l.lesson) === normalized);
  if (existing) {
    return {
      saved: false,
      duplicate: true,
      contextPath: contextPath(input.projectDir),
      metadataPath: metadataPath(input.projectDir),
      entry: existing,
      totalLessons: lessons.length,
    };
  }

  const entry: LessonEntry = {
    category: input.category,
    lesson: input.lesson.trim(),
    reason: input.reason.trim(),
    capturedAt: new Date().toISOString(),
  };
  lessons.push(entry);
  meta.lessons = lessons;
  meta.updatedAt = new Date().toISOString();
  await writeFile(metadataPath(input.projectDir), JSON.stringify(meta, null, 2), "utf8");

  const ctxPath = contextPath(input.projectDir);
  if (!existsSync(ctxPath)) {
    throw new Error(`Expected ${ctxPath} to exist — run install_setup first.`);
  }
  const ctx = await readFile(ctxPath, "utf8");
  const newCtx = addLessonToContext(ctx, formatBullet(entry));
  await writeFile(ctxPath, newCtx, "utf8");

  return {
    saved: true,
    duplicate: false,
    contextPath: ctxPath,
    metadataPath: metadataPath(input.projectDir),
    entry,
    totalLessons: lessons.length,
  };
}

export interface ListLessonsInput {
  projectDir: string;
  category?: LessonCategory;
}

export interface ListLessonsResult {
  projectDir: string;
  total: number;
  byCategory: Record<LessonCategory, number>;
  lessons: LessonEntry[];
}

export async function listLessons(input: ListLessonsInput): Promise<ListLessonsResult> {
  const meta = await readMetadataForLessons(input.projectDir);
  const all = meta?.lessons ?? [];
  const filtered = input.category ? all.filter((l) => l.category === input.category) : all;
  const byCategory: Record<LessonCategory, number> = { code: 0, process: 0, tooling: 0, domain: 0 };
  for (const l of all) byCategory[l.category]++;
  return {
    projectDir: input.projectDir,
    total: all.length,
    byCategory,
    lessons: filtered,
  };
}
