import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listPrds } from "../core/prds.js";

export function registerListPrds(server: McpServer): void {
  server.registerTool(
    "list_prds",
    {
      title: "List PRDs in the project",
      description:
        "Walks docs/requirements/PRD-*/PRD-*.md and returns a sorted array of { id, slug, title, status, path, epicCount } per PRD. Read-only; mirrors the shape of list_rules. Status comes from the body line `> **Status:** <state>`.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
      },
    },
    async ({ projectDir }) => {
      const result = await listPrds({ projectDir });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
