import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateWorkflowReport } from "../core/workflow-report.js";

export function registerGenerateWorkflowReport(server: McpServer): void {
  server.registerTool(
    "generate_workflow_report",
    {
      title: "Generate a single-file HTML kanban of every PRD/epic/story",
      description:
        "Walks docs/requirements/PRD-*/EPIC-*/US-*.md, parses each story's YAML frontmatter, and writes a self-contained HTML kanban to .claude/workflow-report.html. Columns are draft / ready / in_progress / done / blocked plus an unparsed lane for stories with missing or malformed frontmatter. Re-run to refresh.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
      },
    },
    async ({ projectDir }) => {
      const result = await generateWorkflowReport({ projectDir });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
