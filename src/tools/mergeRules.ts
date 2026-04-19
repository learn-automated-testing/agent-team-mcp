import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mergeRules } from "../core/rule-ops.js";

export function registerMergeRules(server: McpServer) {
  server.registerTool(
    "merge_rules",
    {
      title: "Merge multiple rule files into one",
      description:
        "Reads the listed source rule files from .claude/rules/, concatenates their bullets (deduped), writes them into the target 'into' file (with a union of the source 'paths:' globs by default), and deletes the sources. Use to consolidate duplicates flagged by audit_rules.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        into: z.string().describe("Target rule filename (kebab-case, no .md) — may be one of the sources"),
        from: z.array(z.string()).describe("Source rule names to merge (at least 2)"),
        paths: z.array(z.string()).optional().describe("Override the merged 'paths:' — defaults to union of source paths"),
        title: z.string().optional().describe("Override the H1 title — defaults to first source's title"),
        overwrite: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .default(false)
          .describe("Replace an existing target that is not in 'from'. Default false."),
      },
    },
    async ({ projectDir, into, from, paths, title, overwrite }) => {
      const ow = typeof overwrite === "string" ? overwrite === "true" : overwrite;
      const result = await mergeRules({ projectDir, into, from, paths, title, overwrite: ow });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
