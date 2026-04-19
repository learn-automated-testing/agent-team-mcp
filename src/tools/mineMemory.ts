import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mineMemory } from "../core/memory-mine.js";

export function registerMineMemory(server: McpServer) {
  server.registerTool(
    "mine_memory",
    {
      title: "Mine auto-memory for candidate rules and lessons",
      description:
        "Reads Claude Code's per-project auto-memory (~/.claude/projects/<encoded>/memory/*.md), deduplicates entries against the team-shared artifacts already in .claude/rules/, .claude/.skillsrepo.json lessons, and .claude/context.md's Learned conventions. Returns the novel entries as 'candidates' with a suggested target (rule or lesson) and metadata. Read-only — never writes. Use promote_memory to convert one candidate into a real rule or lesson.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        memoryDir: z
          .string()
          .optional()
          .describe("Override the default auto-memory directory. Normally skillsrepo finds ~/.claude/projects/<encoded>/memory/ itself."),
      },
    },
    async ({ projectDir, memoryDir }) => {
      const result = await mineMemory({ projectDir, memoryDir });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
