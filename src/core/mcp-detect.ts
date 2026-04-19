import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

interface MaybeMcpConfig {
  mcpServers?: Record<string, unknown>;
  projects?: Record<string, { mcpServers?: Record<string, unknown> }>;
}

async function readJson(path: string): Promise<MaybeMcpConfig | null> {
  if (!existsSync(path)) return null;
  try {
    const raw = await readFile(path, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as MaybeMcpConfig;
  } catch {
    return null;
  }
}

export async function detectInstalledMcps(projectDir: string): Promise<string[]> {
  const names = new Set<string>();

  // User-level Claude Code config. Only enumerate keys — never read server configs
  // (they can contain tokens, API keys, env vars).
  const userConfig = await readJson(join(homedir(), ".claude.json"));
  if (userConfig?.mcpServers) {
    for (const name of Object.keys(userConfig.mcpServers)) names.add(name);
  }
  const projectEntry = userConfig?.projects?.[projectDir];
  if (projectEntry?.mcpServers) {
    for (const name of Object.keys(projectEntry.mcpServers)) names.add(name);
  }

  // Project-local .mcp.json
  const projectConfig = await readJson(join(projectDir, ".mcp.json"));
  if (projectConfig?.mcpServers) {
    for (const name of Object.keys(projectConfig.mcpServers)) names.add(name);
  }

  return [...names].sort();
}
