import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { archiveRule } from "../core/rule-ops.js";

export function registerArchiveRule(server: McpServer) {
  server.registerTool(
    "archive_rule",
    {
      title: "Archive a rule so it stops auto-loading",
      description:
        "Moves .claude/rules/<name>.md to .claude/rules/archive/<name>.md. Claude Code does not scan the archive subfolder, so the rule stops loading into sessions but history is preserved. Use for rules that are obsolete but you don't want to delete.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        name: z.string().describe("Rule filename (kebab-case, no .md)"),
      },
    },
    async ({ projectDir, name }) => {
      const result = await archiveRule({ projectDir, name });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
