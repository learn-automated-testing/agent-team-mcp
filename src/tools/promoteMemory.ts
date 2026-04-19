import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { promoteAsLesson, promoteAsRule } from "../core/promote.js";

export function registerPromoteMemory(server: McpServer) {
  server.registerTool(
    "promote_memory",
    {
      title: "Promote a memory candidate to a rule or lesson",
      description:
        "Converts one mined auto-memory entry into a team-shared artifact. If target='rule', writes a .claude/rules/<name>.md via addRule. If target='lesson', appends to .claude/context.md and .claude/.skillsrepo.json via captureLesson. Delegates to the existing machinery so all validation is inherited (non-empty reason for lessons, kebab-case rule names, dedup).",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        target: z.enum(["rule", "lesson"]).describe("Where to promote the candidate"),
        rule: z
          .object({
            name: z.string().describe("Rule filename (kebab-case, no .md extension)"),
            title: z.string().describe("H1 title for the rule"),
            rules: z.union([z.string(), z.array(z.string())]).describe("One rule string or an array"),
            paths: z.array(z.string()).optional().describe("Glob patterns for path-scoping, or omit for project-wide"),
            reason: z.string().optional(),
            goodExample: z.object({ code: z.string(), language: z.string().optional() }).optional(),
            badExample: z.object({ code: z.string(), language: z.string().optional() }).optional(),
            overwrite: z
              .union([z.boolean(), z.enum(["true", "false"])])
              .default(false),
          })
          .optional()
          .describe("Required when target='rule'"),
        lesson: z
          .object({
            category: z.enum(["code", "process", "tooling", "domain"]),
            lesson: z.string(),
            reason: z.string().describe("Why this lesson exists — required"),
          })
          .optional()
          .describe("Required when target='lesson'"),
      },
    },
    async ({ projectDir, target, rule, lesson }) => {
      if (target === "rule") {
        if (!rule) throw new Error("Missing 'rule' object for target='rule'");
        const ow = typeof rule.overwrite === "string" ? rule.overwrite === "true" : rule.overwrite;
        const result = await promoteAsRule({ ...rule, projectDir, overwrite: ow });
        return { content: [{ type: "text", text: JSON.stringify({ target, result }, null, 2) }] };
      }
      if (!lesson) throw new Error("Missing 'lesson' object for target='lesson'");
      const result = await promoteAsLesson({ ...lesson, projectDir });
      return { content: [{ type: "text", text: JSON.stringify({ target, result }, null, 2) }] };
    },
  );
}
