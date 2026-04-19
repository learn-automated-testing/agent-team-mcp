import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listLessons } from "../core/lessons.js";

export function registerListLessons(server: McpServer) {
  server.registerTool(
    "list_lessons",
    {
      title: "List captured lessons for this project",
      description:
        "Returns all lessons captured for this project, optionally filtered by category. Reads from .claude/.skillsrepo.json. Useful for reviewing accumulated conventions or for cross-project analysis.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        category: z
          .enum(["code", "process", "tooling", "domain"])
          .optional()
          .describe("If given, only return lessons of this category"),
      },
    },
    async ({ projectDir, category }) => {
      const result = await listLessons({ projectDir, category });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
