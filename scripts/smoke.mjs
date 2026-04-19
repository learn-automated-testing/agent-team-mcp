#!/usr/bin/env node
import { spawn } from "node:child_process";
import { rmSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const OUT = "/tmp/skillsrepo-smoke";
rmSync(OUT, { recursive: true, force: true });

const proc = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "inherit"] });

let buf = "";
const pending = new Map();
let nextId = 1;

proc.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx);
    buf = buf.slice(idx + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

function send(method, params) {
  const id = nextId++;
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((res) => pending.set(id, res));
}
function notify(method, params) {
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}
async function tool(name, args) {
  const r = await send("tools/call", { name, arguments: args });
  if (r.result.isError) throw new Error(r.result.content[0].text);
  return JSON.parse(r.result.content[0].text);
}

try {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  });
  notify("notifications/initialized");

  console.log("=== recommend_setup (with open_questions) ===");
  const plan = await tool("recommend_setup", { projectDir: process.cwd() });
  console.log(`Plan: ${plan.agents.length} agents, ${plan.skills.length} skills, ${plan.openQuestions.length} open questions`);
  for (const q of plan.openQuestions) {
    console.log(`  ? ${q.id}${q.optional ? "" : " *"}: ${q.prompt}${q.choices ? ` [${q.choices.join("|")}]` : ""}`);
  }

  console.log("\n=== install_setup with answers ===");
  const answers = {
    primary_user: "engineers using Claude Code on multiple projects",
    domain: "developer tooling / AI agent orchestration",
    style_guide: "https://google.github.io/styleguide/tsguide.html",
    preferred_test: "vitest",
    preferred_deploy: "none-yet",
  };
  const report = await tool("install_setup", {
    projectDir: process.cwd(),
    outDir: OUT,
    answers,
  });
  console.log(`Installed ${report.written.length}, skipped ${report.skipped.length}, missing answers: [${report.missingAnswers.join(", ") || "none"}]`);

  console.log("\n=== spot-check: developer.md has stack section ===");
  const dev = `${OUT}/.claude/agents/developer.md`;
  const devBody = readFileSync(resolve(dev), "utf8");
  const startIdx = devBody.indexOf("<!-- skillsrepo:detected-stack:start -->");
  const endIdx = devBody.indexOf("<!-- skillsrepo:detected-stack:end -->");
  console.log(`markers found: start=${startIdx !== -1}, end=${endIdx !== -1}`);

  console.log("\n=== spot-check: Available MCPs rendered in stack section ===");
  const stackBlockMatch = devBody.match(/<!-- skillsrepo:detected-stack:start -->([\s\S]*?)<!-- skillsrepo:detected-stack:end -->/);
  const stackBlock = stackBlockMatch?.[1] ?? "";
  const hasMcpsLine = stackBlock.includes("Available MCPs");
  console.log(`"Available MCPs" line present in stack section: ${hasMcpsLine} (only true if user has MCPs configured)`);

  console.log("\n=== spot-check: handoff-protocol snippet expanded ===");
  const hasHandoffHeader = devBody.includes("## Handoff protocol");
  const hasTaskInvocation = devBody.includes("Invoke the next sub-agent via the `Task` tool");
  const hasRawSnippetTag = devBody.includes("{{snippet:handoff-protocol}}");
  console.log(`"## Handoff protocol" header present: ${hasHandoffHeader}`);
  console.log(`Task invocation instruction present: ${hasTaskInvocation}`);
  console.log(`raw {{snippet:…}} tag NOT present (should be false): ${hasRawSnippetTag}`);
  if (!hasHandoffHeader || !hasTaskInvocation || hasRawSnippetTag) {
    throw new Error("handoff-protocol snippet did not expand correctly");
  }

  console.log("\n=== refine_item: update test skill ===");
  const refineReport = await tool("refine_item", {
    projectDir: OUT,
    kind: "skill",
    name: "test",
  });
  console.log(`action: ${refineReport.action}`);

  console.log("\n=== refine_item: idempotency (same inputs → no-change) ===");
  const refine2 = await tool("refine_item", {
    projectDir: OUT,
    kind: "skill",
    name: "test",
  });
  console.log(`action: ${refine2.action} (expect no-change)`);

  console.log("\n=== refine_item: update with new answer ===");
  const refine3 = await tool("refine_item", {
    projectDir: OUT,
    kind: "agent",
    name: "developer",
    answers: { style_guide: "https://github.com/airbnb/javascript" },
  });
  console.log(`action: ${refine3.action}`);

  const devAfterRefine = readFileSync(resolve(dev), "utf8");
  const hasAirbnb = devAfterRefine.includes("airbnb/javascript");
  console.log(`developer.md now references airbnb/javascript: ${hasAirbnb}`);

  console.log("\n=== hooks installed ===");
  const settingsPath = `${OUT}/.claude/settings.json`;
  if (existsSync(settingsPath)) {
    const settings = JSON.parse(readFileSync(resolve(settingsPath), "utf8"));
    const postTool = settings.hooks?.PostToolUse ?? [];
    const stop = settings.hooks?.Stop ?? [];
    console.log(`settings.json has PostToolUse entries: ${postTool.length}, Stop entries: ${stop.length}`);
    console.log(`stack-freshness script present: ${existsSync(resolve(`${OUT}/.claude/hooks/stack-freshness.mjs`))}`);
    console.log(`state-validator script present: ${existsSync(resolve(`${OUT}/.claude/hooks/state-validator.mjs`))}`);
  }

  console.log("\n=== hook install idempotency ===");
  const report3 = await tool("install_setup", {
    projectDir: process.cwd(),
    outDir: OUT,
    overwrite: true,
    answers,
  });
  const merged = report3.hooks?.settingsMerged ?? [];
  const alreadyPresent = merged.filter((m) => m.action === "already-present").length;
  console.log(`re-run: ${alreadyPresent}/${merged.length} hook entries already-present (expect all)`);

  console.log("\n=== measure_team ===");
  const transcript = [
    { type: "user", message: { content: "can you write a PRD for our notifications feature?" } },
    { type: "user", message: { content: "run tests on the new module please" } },
    { type: "user", message: { content: "this is broken, I'm getting an error in the login flow" } },
    { type: "user", message: { content: "what's the weather in SF?" } },
    {
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", name: "Task", input: { subagent_type: "developer", prompt: "build it" } },
        ],
      },
    },
    { type: "user", message: { content: "review this PR please" } },
  ].map((m) => JSON.stringify(m)).join("\n");

  const measure = await tool("measure_team", { projectDir: OUT, transcript });
  console.log(`messages analyzed: ${measure.userMessagesAnalyzed} user / ${measure.totalMessages} total`);
  const pickSkill = (name) => measure.perSkill.find((s) => s.name === name)?.expectedMatches ?? 0;
  console.log(`  prd matches:    ${pickSkill("prd")} (expect ≥1 from "write a PRD")`);
  console.log(`  test matches:   ${pickSkill("test")} (expect ≥1 from "run tests")`);
  console.log(`  debug matches:  ${pickSkill("debug")} (expect ≥1 from "I'm getting an error")`);
  console.log(`  review matches: ${pickSkill("review")} (expect ≥1 from "review this")`);
  console.log(`uncovered: ${measure.uncoveredUserMessages.length} (expect the weather one)`);
  console.log(`developer agent invocations: ${measure.perAgent.find((a) => a.name === "developer")?.taskInvocations ?? 0} (expect 1)`);
  console.log(`suggestions (${measure.suggestions.length}):`);
  for (const s of measure.suggestions) console.log(`  - ${s}`);

  console.log("\n=== capture_lesson ===");
  const cap1 = await tool("capture_lesson", {
    projectDir: OUT,
    category: "code",
    lesson: "Store money as integer cents, never floats.",
    reason: "Float arithmetic caused a £0.01 drift on invoice totals in Q3 2025.",
  });
  console.log(`first capture: saved=${cap1.saved}, duplicate=${cap1.duplicate}, total=${cap1.totalLessons}`);

  const cap2 = await tool("capture_lesson", {
    projectDir: OUT,
    category: "code",
    lesson: "  store money as integer cents, NEVER floats.  ",
    reason: "same issue",
  });
  console.log(`dedup capture: saved=${cap2.saved}, duplicate=${cap2.duplicate} (expect duplicate=true)`);

  const cap3 = await tool("capture_lesson", {
    projectDir: OUT,
    category: "process",
    lesson: "Always run the full test suite before merging a hotfix.",
    reason: "Skipped tests on a hotfix once, introduced a regression that took the site down for 20 minutes.",
  });
  console.log(`second lesson: saved=${cap3.saved}, total=${cap3.totalLessons}`);

  try {
    await tool("capture_lesson", {
      projectDir: OUT,
      category: "code",
      lesson: "Some rule",
      reason: "   ",
    });
    console.log("ERROR: empty reason was accepted (should have thrown)");
  } catch (e) {
    console.log(`empty reason rejected: ${e.message.slice(0, 80)}`);
  }

  console.log("\n=== list_lessons ===");
  const list = await tool("list_lessons", { projectDir: OUT });
  console.log(`total: ${list.total}, byCategory:`, list.byCategory);
  for (const l of list.lessons) {
    console.log(`  [${l.category}] ${l.lesson}`);
  }

  const ctxPath = `${OUT}/.claude/context.md`;
  const ctxBody = readFileSync(resolve(ctxPath), "utf8");
  const hasLearnedSection = ctxBody.includes("## Learned conventions");
  const hasCentsLesson = ctxBody.includes("integer cents");
  console.log(`context.md has Learned conventions section: ${hasLearnedSection}`);
  console.log(`context.md has cents lesson: ${hasCentsLesson}`);

  console.log("\n=== Claude-canon layout ===");
  const claudeMd = `${OUT}/CLAUDE.md`;
  const rulesDirExists = existsSync(resolve(`${OUT}/.claude/rules`));
  const devRefs = existsSync(resolve(`${OUT}/.claude/skills/prd/references`));
  const devExamples = existsSync(resolve(`${OUT}/.claude/skills/prd/examples`));
  console.log(`CLAUDE.md at root: ${existsSync(resolve(claudeMd))}`);
  console.log(`.claude/rules/ directory: ${rulesDirExists}`);
  console.log(`prd skill has references/: ${devRefs}`);
  console.log(`prd skill has examples/: ${devExamples}`);

  const cmBody = readFileSync(resolve(claudeMd), "utf8");
  const hasImport = cmBody.includes("@.claude/context.md");
  const hasAgentsList = cmBody.includes("product-owner");
  console.log(`CLAUDE.md imports context.md via @: ${hasImport}`);
  console.log(`CLAUDE.md lists installed agents: ${hasAgentsList}`);

  console.log("\n=== add_rule + list_rules ===");
  const addResult = await tool("add_rule", {
    projectDir: OUT,
    name: "typescript-error-handling",
    paths: ["**/*.ts"],
    title: "TypeScript error handling",
    rules: [
      "All async functions must wrap external calls in try/catch.",
      "Error messages must include context (operation, params).",
      "Never silently swallow errors.",
    ],
    reason: "Unhandled rejections crash the process. Silent catches mask production issues.",
    goodExample: {
      language: "ts",
      code: "try {\n  const res = await fetch(url);\n} catch (err) {\n  return Err(`Fetch failed: ${(err as Error).message}`);\n}",
    },
    badExample: { language: "ts", code: "return await fetch(url);" },
  });
  console.log(`add_rule saved: ${addResult.saved}, path: ${addResult.path}`);

  const addAgain = await tool("add_rule", {
    projectDir: OUT,
    name: "typescript-error-handling",
    title: "ignored",
    rules: ["ignored"],
  });
  console.log(`re-add without overwrite: saved=${addAgain.saved}, alreadyExisted=${addAgain.alreadyExisted}`);

  const addUnscoped = await tool("add_rule", {
    projectDir: OUT,
    name: "file-length",
    title: "Files under 200 lines",
    rules: ["Source files should not exceed 200 lines."],
    reason: "Longer files usually indicate multiple responsibilities.",
  });
  console.log(`unscoped rule saved: ${addUnscoped.saved}`);

  const listAll = await tool("list_rules", { projectDir: OUT });
  console.log(`list_rules total: ${listAll.total}`);
  for (const r of listAll.rules) console.log(`  - ${r.name}: "${r.title}" scope=${JSON.stringify(r.paths)}`);

  const listFilter = await tool("list_rules", { projectDir: OUT, pathFilter: "src/foo.ts" });
  console.log(`list_rules with pathFilter 'src/foo.ts': ${listFilter.total} (expect TS rule matches)`);

  console.log("\n=== mine_memory + promote_memory ===");
  const fakeMemoryDir = `${OUT}/fake-memory`;
  const mkdirSync = (await import("node:fs")).mkdirSync;
  const writeFileSync = (await import("node:fs")).writeFileSync;
  mkdirSync(fakeMemoryDir, { recursive: true });
  writeFileSync(
    `${fakeMemoryDir}/MEMORY.md`,
    [
      "# Project memory",
      "",
      "## Build commands",
      "- Always run `npm run build` before testing.",
      "- Rebuild TypeScript outputs in dist/ before publishing.",
      "",
      "## Code patterns",
      "- In TypeScript, never throw raw Error — wrap with context before rethrowing.",
      "- Store money as integer cents, never floats.",
      "- PR reviewers always leave a comment summarizing the diff.",
      "",
    ].join("\n"),
  );

  const mined = await tool("mine_memory", { projectDir: OUT, memoryDir: fakeMemoryDir });
  console.log(`memoryExists: ${mined.memoryExists}, total candidates: ${mined.total}, alreadyCaptured: ${mined.alreadyCaptured}`);
  for (const c of mined.candidates) {
    console.log(`  → [${c.target}] "${c.text.slice(0, 70)}..." ${c.suggested.ruleName ? "name=" + c.suggested.ruleName : ""} ${c.suggested.rulePaths ? "paths=" + JSON.stringify(c.suggested.rulePaths) : ""}`);
  }

  const ruleCandidate = mined.candidates.find((c) => c.target === "rule" && c.suggested.rulePaths);
  if (ruleCandidate) {
    const promoted = await tool("promote_memory", {
      projectDir: OUT,
      target: "rule",
      rule: {
        name: ruleCandidate.suggested.ruleName ?? "mined-rule",
        title: "Error wrapping in TypeScript",
        rules: [ruleCandidate.text],
        paths: ruleCandidate.suggested.rulePaths,
        reason: "Captured from auto-memory — avoid opaque Error propagation.",
      },
    });
    console.log(`promoted as rule: saved=${promoted.result.saved}, path=${promoted.result.path}`);
  }

  const lessonCandidate = mined.candidates.find((c) => c.target === "lesson");
  if (lessonCandidate) {
    const promoted = await tool("promote_memory", {
      projectDir: OUT,
      target: "lesson",
      lesson: {
        category: lessonCandidate.suggested.lessonCategory ?? "code",
        lesson: lessonCandidate.text,
        reason: "Captured from auto-memory during dogfooding.",
      },
    });
    console.log(`promoted as lesson: saved=${promoted.result.saved}, totalLessons=${promoted.result.totalLessons}`);
  }

  const minedAgain = await tool("mine_memory", { projectDir: OUT, memoryDir: fakeMemoryDir });
  console.log(`second mine after promotion: total=${minedAgain.total}, alreadyCaptured=${minedAgain.alreadyCaptured} (expect alreadyCaptured to have grown)`);

  console.log("\n=== audit_rules ===");
  const audit = await tool("audit_rules", { projectDir: OUT });
  console.log(`health: ${audit.health}, total: ${audit.total}, scoped: ${audit.scoped}, unscoped: ${audit.unscoped}`);
  console.log(`duplicates: ${audit.duplicates.length}, stale: ${audit.stale.length}, oversize: ${audit.oversize.length}`);
  for (const w of audit.warnings.slice(0, 5)) console.log(`  ⚠ ${w}`);

  console.log("\n=== archive_rule ===");
  const archived = await tool("archive_rule", { projectDir: OUT, name: "file-length" });
  console.log(`archived: ${archived.archived}, to: ${archived.to}`);
  const listAfterArchive = await tool("list_rules", { projectDir: OUT });
  console.log(`rules after archive: ${listAfterArchive.total} (expect one less)`);

  console.log("\n=== merge_rules ===");
  await tool("add_rule", {
    projectDir: OUT, name: "merge-source-a", paths: ["**/*.ts"],
    title: "Source A", rules: ["Rule A-1", "Rule A-2"],
  });
  await tool("add_rule", {
    projectDir: OUT, name: "merge-source-b", paths: ["**/*.tsx"],
    title: "Source B", rules: ["Rule B-1", "Rule A-2"],
  });
  const mergedRules = await tool("merge_rules", {
    projectDir: OUT, into: "merged-ts-rules",
    from: ["merge-source-a", "merge-source-b"],
    title: "Merged TS rules",
  });
  console.log(`merged saved: ${mergedRules.saved}, bullets: ${mergedRules.mergedBulletCount} (expect 3 — dedup), paths: ${JSON.stringify(mergedRules.unionPaths)}`);
  console.log(`deleted: ${mergedRules.deleted.length} source files`);

  console.log("\n=== generate_audit_report ===");
  const auditReport = await tool("generate_audit_report", { projectDir: OUT });
  console.log(`report written: ${auditReport.path} (${auditReport.bytes} bytes)`);
  const html = readFileSync(resolve(auditReport.path), "utf8");
  console.log(`contains project name: ${html.includes("<h1>skillsrepo audit")}`);
  console.log(`contains Rules section: ${html.includes("<h2>Rules")}`);
  console.log(`contains Lessons section: ${html.includes("<h2>Lessons")}`);
  console.log(`contains Team section: ${html.includes("<h2>Team")}`);
  console.log(`contains Stack section: ${html.includes("<h2>Stack")}`);

  console.log("\n=== list_rule_templates + install_rule_from_template ===");
  const tmplList = await tool("list_rule_templates", {});
  console.log(`library has ${tmplList.length} templates`);
  const fileLenTmpl = tmplList.find((t) => t.id === "ts-file-length");
  console.log(`ts-file-length has ${fileLenTmpl?.questions.length ?? 0} question(s), choices: ${JSON.stringify(fileLenTmpl?.questions[0]?.choices)}`);

  const installedFromTmpl = await tool("install_rule_from_template", {
    projectDir: OUT,
    templateId: "ts-file-length",
    answers: { max_lines: "300" },
    overrides: { name: "ts-file-length-300" },
  });
  console.log(`installed from template: saved=${installedFromTmpl.addRuleResult.saved}, path=${installedFromTmpl.addRuleResult.path}`);
  console.log(`answersUsed: ${JSON.stringify(installedFromTmpl.answersUsed)}`);

  const installedNoAnswer = await tool("install_rule_from_template", {
    projectDir: OUT,
    templateId: "ts-strict-typing",
  });
  console.log(`no-question template installed: saved=${installedNoAnswer.addRuleResult.saved}`);

  try {
    await tool("install_rule_from_template", {
      projectDir: OUT,
      templateId: "ts-file-length",
      answers: { max_lines: "99999" },
      overrides: { name: "ts-file-length-invalid" },
    });
    console.log("ERROR: invalid choice was accepted");
  } catch (e) {
    console.log(`invalid choice rejected: ${e.message.slice(0, 80)}`);
  }

  const fileLenBody = readFileSync(resolve(`${OUT}/.claude/rules/ts-file-length-300.md`), "utf8");
  console.log(`rendered file-length-300 contains "300 lines": ${fileLenBody.includes("300 lines")}`);

  console.log("\n=== regenerated dashboard with template cards ===");
  const dashReport2 = await tool("generate_audit_report", { projectDir: OUT });
  const dashHtml = readFileSync(resolve(dashReport2.path), "utf8");
  console.log(`dashboard size: ${dashHtml.length} bytes`);
  console.log(`contains "Rule templates" section: ${dashHtml.includes("<h2>Rule templates")}`);
  console.log(`contains ts-file-length card: ${dashHtml.includes("ts-file-length")}`);
  console.log(`contains Copy button: ${dashHtml.includes("copyInstall")}`);
  console.log(`contains install prompt text: ${dashHtml.includes("Install the")}`);
  console.log(`does NOT contain form fields (static cards): ${!dashHtml.includes("<select name=\\\"max_lines\\\"")}`);

  console.log("\n=== metadata persisted ===");
  const metaPath = `${OUT}/.claude/.skillsrepo.json`;
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(resolve(metaPath), "utf8"));
    console.log("answers in .skillsrepo.json:", meta.answers);
  }
} catch (e) {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
} finally {
  proc.kill();
}
