import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { refineItem } from "../core/refine.js";

export function registerRefineItem(server: McpServer) {
  server.registerTool(
    "refine_item",
    {
      title: "Refine a single agent, skill, or workflow",
      description:
        "Re-inspects the project and updates a single installed item (agent, skill, or workflow) with the current detected stack. By default updates only the marker-delimited 'Detected stack' section, leaving any user edits elsewhere untouched. Pass resyncBody=true to re-sync the whole template body (discards customizations outside the markers). Use this while developing when the project's stack has changed.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        kind: z.enum(["agent", "skill", "workflow"]).describe("Type of item to refine"),
        name: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "name must be kebab-case (a-z, 0-9, hyphens)")
          .describe("Name of the item (kebab-case, e.g. 'developer', 'test', 'new-feature')"),
        answers: z
          .union([z.record(z.string()), z.string()])
          .optional()
          .describe("Updated answers (primary_user, domain, etc.). Pass as an object, or as a JSON string. Merged with answers saved at install time."),
        resyncBody: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .default(false)
          .describe("If true, rewrite the full body from the current template (discards local edits outside the markers). Default false — only updates the stack section. Accepts boolean or string 'true'/'false'."),
      },
    },
    async ({ projectDir, kind, name, answers, resyncBody }) => {
      const parsed = typeof answers === "string" ? JSON.parse(answers) : answers;
      const rb = typeof resyncBody === "string" ? resyncBody === "true" : resyncBody;
      const report = await refineItem({ projectDir, kind, name, answers: parsed, resyncBody: rb });
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
      };
    },
  );
}
