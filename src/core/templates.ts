import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = join(here, "..", "..", "templates");

const SNIPPET_RE = /\{\{snippet:([\w-]+)\}\}/g;

async function expandSnippets(body: string): Promise<string> {
  const names = new Set<string>();
  for (const m of body.matchAll(SNIPPET_RE)) names.add(m[1]);
  if (names.size === 0) return body;
  const snippets: Record<string, string> = {};
  for (const name of names) {
    const path = join(TEMPLATES_DIR, "snippets", `${name}.md`);
    snippets[name] = (await readFile(path, "utf8")).trimEnd();
  }
  return body.replace(SNIPPET_RE, (_, name) => snippets[name] ?? "");
}

export async function listAgentTemplates(): Promise<string[]> {
  const dir = join(TEMPLATES_DIR, "agents");
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();
}

export async function listSkillTemplates(): Promise<string[]> {
  const dir = join(TEMPLATES_DIR, "skills");
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

export async function listWorkflowTemplates(): Promise<string[]> {
  const dir = join(TEMPLATES_DIR, "workflows");
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

export async function readAgentTemplate(name: string): Promise<string> {
  const raw = await readFile(join(TEMPLATES_DIR, "agents", `${name}.md`), "utf8");
  return expandSnippets(raw);
}

export async function readSkillTemplate(name: string): Promise<string> {
  const raw = await readFile(join(TEMPLATES_DIR, "skills", name, "SKILL.md"), "utf8");
  return expandSnippets(raw);
}

export async function listSkillReferenceFiles(name: string): Promise<string[]> {
  const dir = join(TEMPLATES_DIR, "skills", name, "references");
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function readSkillReferenceFile(name: string, file: string): Promise<string> {
  return await readFile(join(TEMPLATES_DIR, "skills", name, "references", file), "utf8");
}

export async function listRequirementsTemplates(): Promise<string[]> {
  const dir = join(TEMPLATES_DIR, "requirements");
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function readRequirementsTemplate(file: string): Promise<string> {
  return await readFile(join(TEMPLATES_DIR, "requirements", file), "utf8");
}

export async function readWorkflowTemplate(name: string): Promise<string> {
  const raw = await readFile(join(TEMPLATES_DIR, "workflows", name, "SKILL.md"), "utf8");
  return expandSnippets(raw);
}

export async function readContextTemplate(): Promise<string> {
  return await readFile(join(TEMPLATES_DIR, "context.md.tmpl"), "utf8");
}

export async function readCopilotInstructionsTemplate(standalone: boolean): Promise<string> {
  const file = standalone ? "copilot-instructions-standalone.md.tmpl" : "copilot-instructions.md.tmpl";
  return await readFile(join(TEMPLATES_DIR, file), "utf8");
}

export async function listInstructionTemplates(): Promise<string[]> {
  const dir = join(TEMPLATES_DIR, "instructions");
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith(".instructions.md.tmpl"))
    .map((f) => f.replace(/\.instructions\.md\.tmpl$/, ""))
    .sort();
}

export async function readInstructionTemplate(name: string): Promise<string> {
  return await readFile(join(TEMPLATES_DIR, "instructions", `${name}.instructions.md.tmpl`), "utf8");
}
