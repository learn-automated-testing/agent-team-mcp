import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateAuditReport } from "../core/audit-report.js";

export function registerGenerateAuditReport(server: McpServer) {
  server.registerTool(
    "generate_audit_report",
    {
      title: "Generate a single-file HTML audit dashboard",
      description:
        "Writes a self-contained HTML dashboard to .claude/audit-report.html combining the rule audit, captured lessons, installed team, and stack fingerprint. Open the resulting file in any browser. Re-run to refresh.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
      },
    },
    async ({ projectDir }) => {
      const result = await generateAuditReport(projectDir);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
