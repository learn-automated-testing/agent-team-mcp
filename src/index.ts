#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerInspectProject } from "./tools/inspectProject.js";
import { registerRecommendSetup } from "./tools/recommendSetup.js";
import { registerInstallSetup } from "./tools/installSetup.js";
import { registerRefineItem } from "./tools/refineItem.js";
import { registerMeasureTeam } from "./tools/measureTeam.js";
import { registerCaptureLesson } from "./tools/captureLesson.js";
import { registerListLessons } from "./tools/listLessons.js";
import { registerAddRule } from "./tools/addRule.js";
import { registerListRules } from "./tools/listRules.js";
import { registerListPrds } from "./tools/listPrds.js";
import { registerMineMemory } from "./tools/mineMemory.js";
import { registerPromoteMemory } from "./tools/promoteMemory.js";
import { registerAuditRules } from "./tools/auditRules.js";
import { registerMergeRules } from "./tools/mergeRules.js";
import { registerArchiveRule } from "./tools/archiveRule.js";
import { registerGenerateAuditReport } from "./tools/generateAuditReport.js";
import { registerGenerateWorkflowReport } from "./tools/generateWorkflowReport.js";
import { registerListRuleTemplates } from "./tools/listRuleTemplates.js";
import { registerInstallRuleFromTemplate } from "./tools/installRuleFromTemplate.js";

const server = new McpServer({
  name: "skillsrepo",
  version: "0.11.0",
});

registerInspectProject(server);
registerRecommendSetup(server);
registerInstallSetup(server);
registerRefineItem(server);
registerMeasureTeam(server);
registerCaptureLesson(server);
registerListLessons(server);
registerAddRule(server);
registerListRules(server);
registerListPrds(server);
registerMineMemory(server);
registerPromoteMemory(server);
registerAuditRules(server);
registerMergeRules(server);
registerArchiveRule(server);
registerGenerateAuditReport(server);
registerGenerateWorkflowReport(server);
registerListRuleTemplates(server);
registerInstallRuleFromTemplate(server);

const transport = new StdioServerTransport();
await server.connect(transport);
