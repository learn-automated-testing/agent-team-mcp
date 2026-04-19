import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { inspectProject } from "../core/inspect.js";

export function registerInspectProject(server: McpServer) {
  server.registerTool(
    "inspect_project",
    {
      title: "Inspect project",
      description:
        "Scans a project directory and returns a deterministic fingerprint: languages, frameworks, test tools, CI, deploy signals, DB deps, existing .claude/ contents, and git stats. Read-only.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root to inspect"),
      },
    },
    async ({ projectDir }) => {
      const fingerprint = await inspectProject(projectDir);
      return {
        content: [{ type: "text", text: JSON.stringify(fingerprint, null, 2) }],
      };
    },
  );
}
