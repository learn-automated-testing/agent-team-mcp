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

export async function readWorkflowTemplate(name: string): Promise<string> {
  const raw = await readFile(join(TEMPLATES_DIR, "workflows", name, "SKILL.md"), "utf8");
  return expandSnippets(raw);
}

export async function readContextTemplate(): Promise<string> {
  return await readFile(join(TEMPLATES_DIR, "context.md.tmpl"), "utf8");
}
