import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { measureTeam } from "../core/measure.js";

export function registerMeasureTeam(server: McpServer) {
  server.registerTool(
    "measure_team",
    {
      title: "Measure team coverage from a transcript",
      description:
        "Analyzes a Claude Code transcript (JSONL lines or raw text) against the installed team and reports: per-skill expected trigger counts + example matches, per-agent Task tool invocations, user messages that matched no skill ('uncovered'), and actionable suggestions for refinement. Use when tuning an installed team based on real usage. Local analysis only, no external service.",
      inputSchema: {
        projectDir: z.string().describe("Absolute path to the project root whose installed team is being measured"),
        transcript: z
          .string()
          .optional()
          .describe("Transcript content (JSONL, one message per line) or a file path to one. If a path, it must exist on disk."),
        transcriptPath: z
          .string()
          .optional()
          .describe("Explicit transcript file path. Takes precedence over transcript."),
      },
    },
    async ({ projectDir, transcript, transcriptPath }) => {
      const report = await measureTeam({ projectDir, transcript, transcriptPath });
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
      };
    },
  );
}
