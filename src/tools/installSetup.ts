import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { installFromProjectDir } from "../core/install.js";

export function registerInstallSetup(server: McpServer) {
  server.registerTool(
    "install_setup",
    {
      title: "Install an agent-and-skill team",
      description:
        "Inspects the project, picks a team of agents + capability skills + workflows, and writes them into .claude/agents/, .claude/skills/, plus .claude/context.md, .claude/state.json, and .claude/.skillsrepo.json. Each agent/skill gets a 'Detected stack' section injected after its frontmatter. Skips existing files unless overwrite=true. Pass answers from the open_questions returned by recommend_setup.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project to analyze and install into"),
        outDir: z.string().optional().describe("Where to write; defaults to projectDir"),
        overwrite: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .default(false)
          .describe("Replace existing files instead of skipping. Accepts boolean or string 'true'/'false'."),
        answers: z
          .union([z.record(z.string()), z.string()])
          .optional()
          .describe("Answers to open_questions from recommend_setup (primary_user, domain, style_guide, preferred_test, preferred_deploy). Pass as an object, or as a JSON string. Saved to .claude/.skillsrepo.json for reuse during refinement."),
        hooks: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .default(true)
          .describe("Install Claude Code hooks (stack-freshness, state-validator) and a pre-commit workflow gate. Default true. Accepts boolean or string 'true'/'false'."),
      },
    },
    async ({ projectDir, outDir, overwrite, answers, hooks }) => {
      const ow = typeof overwrite === "string" ? overwrite === "true" : overwrite;
      const hk = typeof hooks === "string" ? hooks === "true" : hooks;
      const parsed = typeof answers === "string" ? JSON.parse(answers) : answers;
      const report = await installFromProjectDir(projectDir, { outDir, overwrite: ow, answers: parsed, hooks: hk });
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
      };
    },
  );
}
