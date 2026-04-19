import type { Answers, Fingerprint } from "./types.js";

export const STACK_START = "<!-- skillsrepo:detected-stack:start -->";
export const STACK_END = "<!-- skillsrepo:detected-stack:end -->";

export function stackSection(fp: Fingerprint, answers: Answers): string {
  const lines = ["## Detected stack for this project", ""];
  lines.push(`- Project: \`${fp.projectName}\``);
  if (fp.primaryLanguage) lines.push(`- Primary language: \`${fp.primaryLanguage}\``);
  if (fp.frameworks.length) lines.push(`- Frameworks: ${fp.frameworks.map((f) => `\`${f}\``).join(", ")}`);
  if (fp.testFrameworks.length) {
    lines.push(`- Test framework: ${fp.testFrameworks.map((f) => `\`${f}\``).join(", ")}`);
  } else if (answers.preferred_test) {
    lines.push(`- Test framework: \`${answers.preferred_test}\` (user-selected)`);
  }
  if (fp.hasDatabase) lines.push(`- Database: ORM / driver detected`);
  if (fp.deployTargets.length) {
    lines.push(`- Deploy target: ${fp.deployTargets.map((f) => `\`${f}\``).join(", ")}`);
  } else if (answers.preferred_deploy) {
    lines.push(`- Deploy target: \`${answers.preferred_deploy}\` (user-selected)`);
  }
  if (fp.ci.length) lines.push(`- CI: ${fp.ci.map((f) => `\`${f}\``).join(", ")}`);
  if (fp.installedMcps.length) {
    lines.push(`- Available MCPs: ${fp.installedMcps.map((m) => `\`${m}\``).join(", ")}`);
  }
  if (answers.primary_user) lines.push(`- Primary user: ${answers.primary_user}`);
  if (answers.domain) lines.push(`- Domain: ${answers.domain}`);
  if (answers.style_guide) lines.push(`- Style guide: ${answers.style_guide}`);
  lines.push("");
  lines.push("Read `.claude/context.md` for the full project context. This section is maintained by skillsrepo — edits between the markers will be overwritten on the next refinement.");
  return lines.join("\n");
}

export function injectStackSection(body: string, stack: string): string {
  const block = `${STACK_START}\n${stack}\n${STACK_END}`;
  const startIdx = body.indexOf(STACK_START);
  const endIdx = body.indexOf(STACK_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = body.slice(0, startIdx);
    const after = body.slice(endIdx + STACK_END.length);
    return `${before}${block}${after}`;
  }

  // No existing markers — insert after frontmatter close, or prepend if no frontmatter
  const fmOpen = body.startsWith("---\n") ? 0 : -1;
  if (fmOpen !== 0) return `${block}\n\n${body}`;
  const fmCloseIdx = body.indexOf("\n---\n", 4);
  if (fmCloseIdx === -1) return `${block}\n\n${body}`;
  const insertAt = fmCloseIdx + "\n---\n".length;
  return `${body.slice(0, insertAt)}\n${block}\n${body.slice(insertAt)}`;
}
