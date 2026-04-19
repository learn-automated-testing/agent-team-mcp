import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { inspectProject } from "./inspect.js";
import { metadataPath, readMetadata } from "./install.js";
import { injectStackSection, stackSection } from "./stack-section.js";
import {
  readAgentTemplate,
  readSkillTemplate,
  readWorkflowTemplate,
} from "./templates.js";
import type { Answers } from "./types.js";

export type ItemKind = "agent" | "skill" | "workflow";

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface RefineOptions {
  projectDir: string;
  kind: ItemKind;
  name: string;
  answers?: Answers;
  resyncBody?: boolean;
}

export interface RefineReport {
  kind: ItemKind;
  name: string;
  path: string;
  action: "updated-stack-section" | "resynced-full-body" | "installed-fresh" | "no-change";
  answersUsed: Answers;
}

function targetPath(projectDir: string, kind: ItemKind, name: string): string {
  if (kind === "agent") return resolve(projectDir, ".claude", "agents", `${name}.md`);
  return resolve(projectDir, ".claude", "skills", name, "SKILL.md");
}

async function readTemplate(kind: ItemKind, name: string): Promise<string> {
  if (kind === "agent") return readAgentTemplate(name);
  if (kind === "workflow") return readWorkflowTemplate(name);
  return readSkillTemplate(name);
}

export async function refineItem(opts: RefineOptions): Promise<RefineReport> {
  const { projectDir, kind, name } = opts;
  if (!NAME_RE.test(name)) {
    throw new Error(
      `refineItem(kind=${kind}, name=${JSON.stringify(name)}): name must be kebab-case`,
    );
  }
  const fp = await inspectProject(projectDir);

  const savedMeta = await readMetadata(projectDir);
  const answers: Answers = { ...(savedMeta?.answers ?? {}), ...(opts.answers ?? {}) };

  const path = targetPath(projectDir, kind, name);
  const stack = stackSection(fp, answers);

  let newBody: string;
  let action: RefineReport["action"];

  if (!existsSync(path)) {
    const tmpl = await readTemplate(kind, name);
    newBody = injectStackSection(tmpl, stack);
    action = "installed-fresh";
  } else if (opts.resyncBody) {
    const tmpl = await readTemplate(kind, name);
    newBody = injectStackSection(tmpl, stack);
    action = "resynced-full-body";
  } else {
    const existing = await readFile(path, "utf8");
    const updated = injectStackSection(existing, stack);
    if (updated === existing) {
      action = "no-change";
      newBody = existing;
    } else {
      newBody = updated;
      action = "updated-stack-section";
    }
  }

  if (action !== "no-change") {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, newBody, "utf8");
  }

  if (opts.answers && Object.keys(opts.answers).length > 0) {
    const metaPath = metadataPath(projectDir);
    if (existsSync(metaPath)) {
      try {
        const raw = await readFile(metaPath, "utf8");
        const meta = JSON.parse(raw);
        meta.answers = { ...(meta.answers ?? {}), ...opts.answers };
        meta.updatedAt = new Date().toISOString();
        await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
      } catch { /* ignore */ }
    }
  }

  return { kind, name, path, action, answersUsed: answers };
}
