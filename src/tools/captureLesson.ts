import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { captureLesson } from "../core/lessons.js";

export function registerCaptureLesson(server: McpServer) {
  server.registerTool(
    "capture_lesson",
    {
      title: "Capture a learned convention for this project",
      description:
        "Records a lesson (what + why) for this project. Appends a structured entry to .claude/.skillsrepo.json under lessons[], and a markdown bullet under the '## Learned conventions' section of .claude/context.md (creating the section if absent) — which every installed agent reads before acting. Rejects lessons without a 'reason'. Dedupes case-insensitively.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root"),
        category: z
          .enum(["code", "process", "tooling", "domain"])
          .describe("Lesson type: code (patterns/rules), process (how we work), tooling (build/deploy), domain (business logic)"),
        lesson: z.string().describe("The rule itself, stated concisely (e.g. 'Store money as integer cents, never floats')"),
        reason: z
          .string()
          .describe("WHY this lesson exists — the incident, constraint, or pain that motivated it (required, not optional)"),
      },
    },
    async ({ projectDir, category, lesson, reason }) => {
      const result = await captureLesson({ projectDir, category, lesson, reason });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
