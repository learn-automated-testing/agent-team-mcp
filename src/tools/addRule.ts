import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addRule } from "../core/rules.js";

export function registerAddRule(server: McpServer) {
  server.registerTool(
    "add_rule",
    {
      title: "Add a path-scoped coding rule",
      description:
        "Writes a rule file to .claude/rules/<name>.md following Anthropic's canonical rule format (YAML frontmatter with 'paths:' for scoping). Claude Code auto-loads unscoped rules at session start and path-scoped rules when reading matching files. Use this to define coding standards like 'try/catch on all async' or 'files under 200 lines'.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        name: z
          .string()
          .describe("Rule file name (kebab-case, without .md extension), e.g. 'typescript-error-handling'"),
        paths: z
          .array(z.string())
          .optional()
          .describe("Glob patterns for path-scoped rules (e.g. ['src/**/*.ts']). Omit for project-wide rules."),
        title: z.string().describe("Human-readable rule title (shown as H1 in the file)"),
        rules: z
          .union([z.string(), z.array(z.string())])
          .describe("The rule(s) themselves — one string or an array of rule statements"),
        reason: z.string().optional().describe("Why this rule exists (shown as 'Why:' line)"),
        goodExample: z
          .object({
            code: z.string(),
            language: z.string().optional(),
          })
          .optional()
          .describe("Example of code that follows this rule"),
        badExample: z
          .object({
            code: z.string(),
            language: z.string().optional(),
          })
          .optional()
          .describe("Example of code that violates this rule"),
        overwrite: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .default(false)
          .describe("Replace existing rule file with the same name. Default false."),
      },
    },
    async ({ projectDir, name, paths, title, rules, reason, goodExample, badExample, overwrite }) => {
      const ow = typeof overwrite === "string" ? overwrite === "true" : overwrite;
      const result = await addRule({
        projectDir,
        name,
        paths,
        title,
        rules,
        reason,
        goodExample,
        badExample,
        overwrite: ow,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
