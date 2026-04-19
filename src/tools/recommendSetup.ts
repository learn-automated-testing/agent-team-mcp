import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { inspectProject } from "../core/inspect.js";
import { recommendSetup } from "../core/recommend.js";

export function registerRecommendSetup(server: McpServer) {
  server.registerTool(
    "recommend_setup",
    {
      title: "Recommend a team of agents + capability skills",
      description:
        "Given a project directory, inspects it and returns a setup plan: which agents to install (product-owner, developer, qa, etc.), which capability skills to install (prd, db, deploy, etc.), and which workflows (new-feature, bug-fix, etc.). Each item includes a reason and a confidence level. No writes.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project to analyze"),
      },
    },
    async ({ projectDir }) => {
      const fp = await inspectProject(projectDir);
      const plan = recommendSetup(fp);
      return {
        content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
      };
    },
  );
}
