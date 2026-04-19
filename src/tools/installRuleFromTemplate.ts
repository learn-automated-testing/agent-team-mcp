import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { installRuleFromTemplate } from "../core/template-library.js";

export function registerInstallRuleFromTemplate(server: McpServer) {
  server.registerTool(
    "install_rule_from_template",
    {
      title: "Install a rule from a library template",
      description:
        "Applies a bundled rule template (from list_rule_templates) with the given answers to its questions. Each template's `questions` array declares what to ask the user in chat BEFORE calling this tool — collect answers conversationally, then invoke this with the filled-in object. Missing answers default to each question's `default`; invalid choices are rejected. Renders the template's rules with substitution, then delegates to addRule so naming, scoping, and dedup behave identically.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        templateId: z.string().describe("Template id from list_rule_templates (e.g. 'ts-file-length')"),
        answers: z
          .union([z.record(z.string()), z.string()])
          .optional()
          .describe("Answers to the template's questions. Pass as object or JSON string. Missing answers fall back to the question's default."),
        overrides: z
          .object({
            name: z.string().optional(),
            paths: z.array(z.string()).optional(),
            title: z.string().optional(),
          })
          .optional()
          .describe("Override template defaults for rule name, paths, or title."),
        overwrite: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .default(false)
          .describe("Replace an existing rule with the same name. Default false."),
      },
    },
    async ({ projectDir, templateId, answers, overrides, overwrite }) => {
      const parsed = typeof answers === "string" ? JSON.parse(answers) : answers;
      const ow = typeof overwrite === "string" ? overwrite === "true" : overwrite;
      const result = await installRuleFromTemplate({
        projectDir,
        templateId,
        answers: parsed,
        overrides,
        overwrite: ow,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
