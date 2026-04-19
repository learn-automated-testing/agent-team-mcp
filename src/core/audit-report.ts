import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditRules, type RuleAuditReport } from "./audit.js";
import { inspectProject } from "./inspect.js";
import { readMetadataForLessons } from "./lessons.js";
import { loadRuleLibrary, type RuleTemplate } from "./template-library.js";
import type { Fingerprint, LessonEntry, SkillsrepoMetadata } from "./types.js";

export interface GenerateAuditReportResult {
  path: string;
  bytes: number;
  generatedAt: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function healthBadge(h: RuleAuditReport["health"]): string {
  const color = h === "good" ? "#059669" : h === "warning" ? "#d97706" : "#dc2626";
  const label = h === "good" ? "GOOD" : h === "warning" ? "WARNING" : "CLUTTERED";
  return `<span class="badge" style="background:${color}">${label}</span>`;
}

function renderRules(audit: RuleAuditReport): string {
  const thresholds = audit.thresholds;
  const summary = `
    <div class="stats">
      <span class="stat">Total: <b>${audit.total}</b> / ${thresholds.maxTotal} recommended</span>
      <span class="stat">Scoped: <b>${audit.scoped}</b></span>
      <span class="stat">Unscoped: <b>${audit.unscoped}</b> / ${thresholds.maxUnscoped} recommended</span>
      <span class="stat">Duplicates: <b>${audit.duplicates.length}</b></span>
      <span class="stat">Stale: <b>${audit.stale.length}</b></span>
      <span class="stat">Oversize: <b>${audit.oversize.length}</b></span>
    </div>
  `;

  if (audit.total === 0) {
    return summary + `<p class="muted">No rules installed yet. Use <code>add_rule</code> or <code>promote_memory</code> to add one.</p>`;
  }

  const rows = audit.ruleSummaries
    .map((r) => {
      const scope = r.paths && r.paths.length ? r.paths.map((p) => `<code>${escapeHtml(p)}</code>`).join("<br>") : `<span class="muted">(unscoped — always loads)</span>`;
      const isStale = audit.stale.some((s) => s.name === r.name);
      const isOversize = audit.oversize.some((o) => o.name === r.name);
      const tags: string[] = [];
      if (isStale) tags.push(`<span class="tag tag-warn">stale</span>`);
      if (isOversize) tags.push(`<span class="tag tag-warn">oversize</span>`);
      if (!r.paths) tags.push(`<span class="tag tag-info">unscoped</span>`);
      return `
        <tr>
          <td><code>${escapeHtml(r.name)}</code> ${tags.join(" ")}</td>
          <td>${escapeHtml(r.title)}</td>
          <td>${scope}</td>
        </tr>
      `;
    })
    .join("");

  const dups =
    audit.duplicates.length === 0
      ? ""
      : `
    <h3>Duplicate bullets</h3>
    <ul>
      ${audit.duplicates
        .map((d) => `<li><code>${escapeHtml(d.bullet.slice(0, 100))}</code> — appears in: ${d.files.map((f) => `<code>${escapeHtml(f)}</code>`).join(", ")}</li>`)
        .join("")}
    </ul>
    <p class="muted">Consider <code>merge_rules</code> to consolidate.</p>
  `;

  const warnings =
    audit.warnings.length === 0
      ? `<p class="ok">✓ No warnings</p>`
      : `<div class="warnings"><ul>${audit.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul></div>`;

  return (
    summary +
    warnings +
    `<table><thead><tr><th>Name</th><th>Title</th><th>Scope</th></tr></thead><tbody>${rows}</tbody></table>` +
    dups
  );
}

function renderLessons(lessons: LessonEntry[]): string {
  if (lessons.length === 0) {
    return `<p class="muted">No lessons captured yet. Use <code>capture_lesson</code> to record team-shared learnings.</p>`;
  }
  const byCategory = lessons.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1;
    return acc;
  }, {});
  const counts = Object.entries(byCategory)
    .map(([k, v]) => `<span class="stat">${k}: <b>${v}</b></span>`)
    .join("");

  const rows = lessons
    .map(
      (l) => `
      <tr>
        <td><span class="tag tag-info">${l.category}</span></td>
        <td>${escapeHtml(l.lesson)}</td>
        <td class="muted">${escapeHtml(l.reason)}</td>
        <td class="muted">${l.capturedAt.slice(0, 10)}</td>
      </tr>
    `,
    )
    .join("");
  return (
    `<div class="stats">Total: <b>${lessons.length}</b> &nbsp; ${counts}</div>` +
    `<table><thead><tr><th>Category</th><th>Lesson</th><th>Reason</th><th>Captured</th></tr></thead><tbody>${rows}</tbody></table>`
  );
}

function renderTeam(meta: SkillsrepoMetadata | null): string {
  if (!meta) return `<p class="muted">No .skillsrepo.json found — run <code>install_setup</code> first.</p>`;
  const agents = meta.agents.map((a) => `<li><code>${escapeHtml(a)}</code></li>`).join("");
  const skills = meta.skills
    .map((s) => `<li><code>${escapeHtml(s.name)}</code> <span class="tag tag-info">${s.kind}</span></li>`)
    .join("");
  return `
    <div class="cols">
      <div><h3>Agents (${meta.agents.length})</h3><ul>${agents || "<li class='muted'>none</li>"}</ul></div>
      <div><h3>Skills & workflows (${meta.skills.length})</h3><ul>${skills || "<li class='muted'>none</li>"}</ul></div>
    </div>
    <p class="muted">Installed: ${meta.installedAt} · Last updated: ${meta.updatedAt}</p>
  `;
}

function renderStack(fp: Fingerprint, answers: Record<string, string>): string {
  const rows = [
    ["Project name", fp.projectName],
    ["Primary language", fp.primaryLanguage ?? "(unknown)"],
    ["Frameworks", fp.frameworks.join(", ") || "(none)"],
    ["Test frameworks", fp.testFrameworks.join(", ") || answers.preferred_test || "(none)"],
    ["Deploy targets", fp.deployTargets.join(", ") || answers.preferred_deploy || "(none)"],
    ["IaC tools", fp.iacTools.join(", ") || "(none)"],
    ["CI", fp.ci.join(", ") || "(none)"],
    ["Has frontend", String(fp.hasFrontend)],
    ["Has database", String(fp.hasDatabase)],
    ["Installed MCPs", fp.installedMcps.join(", ") || "(none)"],
    ["Primary user", answers.primary_user ?? "(not set)"],
    ["Domain", answers.domain ?? "(not set)"],
    ["Style guide", answers.style_guide ?? "(not set)"],
  ]
    .map(([k, v]) => `<tr><th>${escapeHtml(k as string)}</th><td>${escapeHtml(v as string)}</td></tr>`)
    .join("");
  return `<table class="kv">${rows}</table>`;
}

function describeQuestions(t: RuleTemplate): string {
  if (t.questions.length === 0) return `<span class="muted">no questions — one-step install</span>`;
  return t.questions
    .map((q) => {
      const choices = q.choices ? ` (choice: ${q.choices.join(" / ")})` : ` (free text)`;
      const def = q.default !== undefined ? ` · default <code>${escapeHtml(q.default)}</code>` : "";
      return `<li><code>${escapeHtml(q.id)}</code>${escapeHtml(choices)}${def}</li>`;
    })
    .join("");
}

function renderTemplates(templates: RuleTemplate[]): string {
  const byCategory = new Map<string, RuleTemplate[]>();
  for (const t of templates) {
    const arr = byCategory.get(t.category) ?? [];
    arr.push(t);
    byCategory.set(t.category, arr);
  }

  const renderCard = (t: RuleTemplate): string => {
    const tags = t.tags.map((tg) => `<span class="tag tag-info">${escapeHtml(tg)}</span>`).join(" ");
    const paths = t.defaultPaths.length
      ? t.defaultPaths.map((p) => `<code>${escapeHtml(p)}</code>`).join(", ")
      : `<span class="muted">(project-wide, unscoped)</span>`;
    const questionList =
      t.questions.length > 0
        ? `<div class="template-questions"><strong>Will ask:</strong><ul>${describeQuestions(t)}</ul></div>`
        : `<div class="template-questions"><span class="muted">No questions — one-step install.</span></div>`;
    const copyText = `Install the '${t.id}' rule template.`;
    return `
      <div class="template-card">
        <h4>${escapeHtml(t.title)}</h4>
        <p class="muted">${escapeHtml(t.description)}</p>
        <div class="template-meta"><strong>Id:</strong> <code>${escapeHtml(t.id)}</code> &nbsp; ${tags}</div>
        <div class="template-meta"><strong>Default paths:</strong> ${paths}</div>
        ${questionList}
        <button onclick="copyInstall(this, ${JSON.stringify(copyText)})">Copy install prompt</button>
      </div>
    `;
  };

  const sections: string[] = [];
  for (const [cat, arr] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const cards = arr.map(renderCard).join("");
    sections.push(`<h3>${escapeHtml(cat)}</h3><div class="template-grid">${cards}</div>`);
  }

  const script = `
<script>
function copyInstall(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const prev = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => (btn.textContent = prev), 1500);
  });
}
</script>
  `;

  return `
    <p class="muted">Pick a template → click "Copy install prompt" → paste into Claude Code. Claude will ask the template's questions conversationally, then call <code>install_rule_from_template</code> with your answers. No forms here — the terminal handles the questionnaire.</p>
    ${sections.join("")}
    ${script}
  `;
}

const STYLE = `
body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; max-width: 1100px; margin: 2em auto; padding: 0 1em; color: #1f2937; line-height: 1.5; }
h1 { border-bottom: 2px solid #1f2937; padding-bottom: 0.3em; margin-bottom: 0.3em; }
h2 { color: #1e40af; margin-top: 2.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
h3 { color: #374151; margin-top: 1.5em; }
.stats { display: flex; flex-wrap: wrap; gap: 0.5em; margin: 1em 0; }
.stat { background: #f3f4f6; padding: 0.4em 0.8em; border-radius: 6px; font-size: 0.9em; }
.badge { display: inline-block; color: white; padding: 0.2em 0.6em; border-radius: 4px; font-size: 0.75em; font-weight: 700; letter-spacing: 0.05em; margin-left: 0.5em; vertical-align: middle; }
.warnings { background: #fef3c7; border-left: 4px solid #d97706; padding: 0.75em 1em; margin: 1em 0; border-radius: 4px; }
.warnings ul { margin: 0; padding-left: 1.3em; }
.ok { color: #059669; }
.muted { color: #6b7280; font-size: 0.9em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.92em; }
th, td { text-align: left; padding: 0.5em 0.6em; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
th { background: #f9fafb; font-weight: 600; }
table.kv th { width: 180px; background: #f9fafb; }
code { background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.88em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.tag { display: inline-block; padding: 0.1em 0.45em; border-radius: 3px; font-size: 0.75em; font-weight: 600; }
.tag-info { background: #dbeafe; color: #1e40af; }
.tag-warn { background: #fef3c7; color: #92400e; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 2em; }
ul { margin: 0.4em 0; }
li { margin: 0.3em 0; }
header .meta { color: #6b7280; font-size: 0.9em; }
footer { margin-top: 3em; padding-top: 1em; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.85em; }
.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1em; }
.template-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1em; }
.template-card h4 { margin: 0 0 0.3em 0; }
.template-meta { margin: 0.3em 0; font-size: 0.88em; }
.template-questions { margin: 0.5em 0; font-size: 0.88em; }
.template-questions ul { margin: 0.3em 0 0 0; padding-left: 1.3em; }
.template-card button { background: #1e40af; color: white; padding: 0.4em 0.9em; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; margin-top: 0.5em; }
.template-card button:hover { background: #1d4ed8; }
`;

export async function generateAuditReport(projectDir: string): Promise<GenerateAuditReportResult> {
  const fp = await inspectProject(projectDir);
  const audit = await auditRules(projectDir);
  const meta = await readMetadataForLessons(projectDir);
  const lessons = meta?.lessons ?? [];
  const answers = meta?.answers ?? {};
  const templates = await loadRuleLibrary();

  const generatedAt = new Date().toISOString();
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>skillsrepo audit — ${escapeHtml(fp.projectName)}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
<h1>skillsrepo audit — ${escapeHtml(fp.projectName)}</h1>
<p class="meta">Generated ${escapeHtml(generatedAt)} · <code>${escapeHtml(projectDir)}</code></p>
</header>

<h2>Rules &nbsp;${healthBadge(audit.health)}</h2>
${renderRules(audit)}

<h2>Rule templates (${templates.length})</h2>
${renderTemplates(templates)}

<h2>Lessons</h2>
${renderLessons(lessons)}

<h2>Team</h2>
${renderTeam(meta)}

<h2>Stack fingerprint</h2>
${renderStack(fp, answers)}

<footer>
Generated by skillsrepo v${"0.11.0"}. Regenerate with <code>generate_audit_report</code>.
</footer>
</body>
</html>`;

  const outPath = resolve(projectDir, ".claude", "audit-report.html");
  await writeFile(outPath, body, "utf8");
  return { path: outPath, bytes: Buffer.byteLength(body, "utf8"), generatedAt };
}
