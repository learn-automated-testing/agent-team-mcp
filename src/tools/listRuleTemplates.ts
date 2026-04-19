import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRuleTemplatesLogic } from "../core/template-library.js";

export function registerListRuleTemplates(server: McpServer) {
  server.registerTool(
    "list_rule_templates",
    {
      title: "List bundled rule templates",
      description:
        "Returns the curated library of parameterised rule templates (TypeScript, Python, testing, security, database, process). Each entry includes its questions (if any) so the caller can collect answers before installing via install_rule_from_template.",
      inputSchema: {
        category: z.string().optional().describe("Filter by category (code, testing, security, database, process)"),
        tag: z.string().optional().describe("Filter by tag"),
      },
    },
    async ({ category, tag }) => {
      const templates = await listRuleTemplatesLogic({ category, tag });
      return { content: [{ type: "text", text: JSON.stringify(templates, null, 2) }] };
    },
  );
}
