import { existsSync } from "node:fs";
import type { InstallReport } from "./install.js";
import { findTemplate, installRuleFromTemplate } from "./template-library.js";
import type { PlannedRule } from "./types.js";

/**
 * Install the planned rule pack into `.claude/rules/`.
 *
 * Behaviour:
 *  - For each `PlannedRule`, look up the template by id in the rule library.
 *    A missing id throws — partial installs are never silent.
 *  - With `overwrite=false`, an existing rule file is preserved and recorded
 *    on `report.skipped` with reason `"already exists"`.
 *  - Every successfully written rule is appended to both `report.rules`
 *    (`{ id, path }`) and `report.written` (kind `"rule"`).
 */
export async function installPlannedRules(
  rules: readonly PlannedRule[],
  outDir: string,
  overwrite: boolean,
  report: InstallReport,
): Promise<void> {
  for (const rule of rules) {
    const template = await findTemplate(rule.id);
    if (!template) {
      throw new Error(
        `installPlannedRules: planned rule id '${rule.id}' is not present in the rule library`,
      );
    }

    try {
      const result = await installRuleFromTemplate({
        projectDir: outDir,
        templateId: rule.id,
        overwrite,
      });

      if (result.addRuleResult.saved) {
        report.written.push({
          kind: "rule",
          name: rule.id,
          path: result.addRuleResult.path,
        });
        report.rules.push({ id: rule.id, path: result.addRuleResult.path });
      } else if (result.addRuleResult.alreadyExisted) {
        report.skipped.push({
          kind: "rule",
          name: rule.id,
          reason: "already exists",
        });
      }
    } catch (err) {
      // Preserve the missing-id error path; otherwise surface with context.
      const baseMsg = (err as Error).message;
      if (baseMsg.startsWith("installPlannedRules:")) throw err;
      throw new Error(
        `installPlannedRules(${rule.id}) failed: ${baseMsg}`,
      );
    }

    // Best-effort sanity assertion the file landed where the report says.
    const finalEntry = report.rules[report.rules.length - 1];
    if (finalEntry && finalEntry.id === rule.id && !existsSync(finalEntry.path)) {
      throw new Error(
        `installPlannedRules(${rule.id}) reported a write at ${finalEntry.path} but the file is missing`,
      );
    }
  }
}
