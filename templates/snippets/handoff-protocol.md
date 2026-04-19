## Handoff protocol

When your step is complete and the next role should take over:

1. **Update `.claude/state.json`** with the new current step, status, and a one-line `last_output`:
   ```json
   {
     "current_step": "{next_step}",
     "status": "ready-for-{next_role}",
     "last_output": "{what you produced, one sentence}"
   }
   ```

2. **Invoke the next sub-agent via the `Task` tool.** Pass:
   - `subagent_type`: the target role (one of `product-owner`, `business-analyst`, `ux-designer`, `designer`, `developer`, `qa`, `devops`)
   - `description`: a 3-5 word summary of the work
   - `prompt`: your handoff summary — what was done, file paths of any artifacts, and any open questions for the next role

3. **If the `Task` tool is not in your allowed tool set** (some environments restrict sub-agent nesting), return your handoff summary to the orchestrator prefixed with `HANDOFF → {target}`. The orchestrator (main Claude thread) will spawn the next sub-agent on your behalf with that prompt.

Your turn ends after the handoff. Do not continue into the next role's work yourself.