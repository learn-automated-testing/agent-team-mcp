import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { auditRules } from "../core/audit.js";

export function registerAuditRules(server: McpServer) {
  server.registerTool(
    "audit_rules",
    {
      title: "Audit .claude/rules/ for hygiene issues",
      description:
        "Analyses .claude/rules/ and returns: total count, scoped vs unscoped split, duplicate bullets across files, stale rules (paths: glob matches no files in repo), oversize files, and an overall health rating (good/warning/cluttered). Read-only.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
      },
    },
    async ({ projectDir }) => {
      const result = await auditRules(projectDir);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
