import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRules } from "../core/rules.js";

export function registerListRules(server: McpServer) {
  server.registerTool(
    "list_rules",
    {
      title: "List installed rules",
      description:
        "Returns all rules under .claude/rules/ with their titles, path-scope globs, and a short body preview. Use pathFilter to see only rules that apply to a given file path.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        pathFilter: z
          .string()
          .optional()
          .describe("If set, return only rules whose 'paths:' frontmatter matches this path (e.g. 'src/api/users.ts')"),
      },
    },
    async ({ projectDir, pathFilter }) => {
      const result = await listRules({ projectDir, pathFilter });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
