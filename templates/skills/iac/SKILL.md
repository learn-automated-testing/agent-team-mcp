---
name: iac
description: Plans, applies, and maintains infrastructure-as-code — Terraform, Pulumi, Azure Bicep, AWS CDK. Enforces plan-before-apply discipline, state-file safety, drift detection, and secrets hygiene. Use when the user says "plan the infra change", "apply the terraform", "deploy the bicep", "synth the cdk", "check for drift", "spin up an environment", or "provision the {database, queue, bucket, network}".
---

# Skill: iac

## When to use this skill
Load this skill when the task touches the infrastructure layer through code:
- Terraform — `.tf` files, `terraform plan/apply/destroy`, remote state in S3/GCS/Azure Blob
- Pulumi — `Pulumi.yaml` + program code (TS/Python/Go/.NET), `pulumi preview/up`
- Azure Bicep — `.bicep` files, `az deployment ... what-if/create`, ARM template compilation
- AWS CDK — `cdk.json` + program code (TS/Python/Java/.NET/Go), `cdk diff/deploy/synth`

Do **not** use this skill for application deploys — that is `.claude/skills/deploy/SKILL.md`. IaC provisions the platform; deploy ships the app to it.

## What "applied" means
A change is only done when:
1. A plan / preview / what-if / diff has been generated and reviewed
2. The plan exactly matches what will run in production (no drift since plan)
3. The state file is locked during apply, never touched manually
4. Apply succeeded with the expected resource counts (added / changed / destroyed)
5. Post-apply verification confirms the resource is reachable / functional
6. The change is committed to git AND the state backend
7. `state.json` reflects the environment that was changed

## The four iron rules

**1. Plan before apply, every time.**
- Terraform: `terraform plan -out=tfplan` then `terraform apply tfplan` — never `apply` without a saved plan
- Pulumi: `pulumi preview` then `pulumi up`
- Bicep: `az deployment group what-if --template-file ...` before `create`
- CDK: `cdk diff` before `cdk deploy`

If the plan shows unexpected destroys, **stop**. Figure out why before applying.

**2. State is sacred.**
- Never edit `terraform.tfstate` or `Pulumi.{stack}.json` by hand
- Use remote state with locking (S3 + DynamoDB, GCS, Azure Blob, Pulumi Cloud, Terraform Cloud)
- Never commit `*.tfstate*`, `Pulumi.*.{stack}.encrypted.yaml` (the secret one), `cdk.out/` to git
- For state surgery (renames, moves, imports) use `terraform state mv` / `pulumi state` / `cdk import` — and only with a backup

**3. Secrets do not live in IaC source.**
- No passwords, tokens, or keys in `.tf`, `.bicep`, CDK code, or Pulumi programs
- Use the platform secret store (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) and reference by ARN/URI
- Mark sensitive Terraform outputs with `sensitive = true`
- Pulumi: use `pulumi config set --secret`
- CDK: `SecretValue.secretsManager(...)`, never `SecretValue.unsafePlainText(...)`

**4. One environment per workspace / stack / parameter file.**
- Never share state between dev / staging / production
- Terraform: use workspaces or separate state backends per env
- Pulumi: one stack per env (`dev`, `staging`, `prod`)
- Bicep: parameter files (`main.bicepparam`) per env, separate resource groups
- CDK: one app, multiple stacks, named per env

## Workflows

### Terraform
```bash
terraform fmt -check                          # style guard
terraform validate                            # syntax + types
terraform plan -out=tfplan                    # save the plan
# review the plan output — destroys highlighted in red
terraform apply tfplan                        # apply ONLY the saved plan
terraform output -json > infra-outputs.json   # capture outputs for the deploy skill
```

### Pulumi
```bash
pulumi stack select staging
pulumi preview --diff                         # preview, with diff
pulumi up --yes                               # apply (CI) or interactive (local)
pulumi stack output --json > infra-outputs.json
```

### Azure Bicep
```bash
az bicep build --file main.bicep              # compile to ARM, catch errors
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.bicepparam                # what-if = plan
az deployment group create \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.bicepparam
```

### AWS CDK
```bash
npx cdk synth                                 # synthesize CloudFormation, catch errors
npx cdk diff MyStack-staging                  # diff against deployed
npx cdk deploy MyStack-staging --require-approval broadening
# --require-approval broadening forces a prompt for IAM / SG widening
```

## Pre-apply checklist
- [ ] `git status` is clean — no uncommitted IaC changes
- [ ] On the right branch (usually `main` for prod, feature branch for dev/staging)
- [ ] Backend / cloud auth is correct (`aws sts get-caller-identity`, `az account show`, `gcloud config list`)
- [ ] Plan / preview / diff has been reviewed end-to-end
- [ ] Destroys are intentional and expected
- [ ] Sensitive resources (databases, certificates, DNS) have `prevent_destroy` / equivalent guards
- [ ] Secrets referenced by name from the secret store, never inline
- [ ] Cost impact understood for new resources (especially: NAT gateways, data transfer, large compute)

## Drift detection
Run periodically (or in CI nightly):
```bash
terraform plan -detailed-exitcode             # exit 2 = drift
pulumi preview --diff                         # any output = drift
az deployment group what-if ...               # any change = drift
cdk diff                                      # any output = drift
```
If drift exists, do not silently `apply` to wipe it — investigate. Manual console changes are the most common cause and indicate a process gap.

## Imports
When a resource exists but isn't in state:
- Terraform: `terraform import {address} {id}` then write the matching `.tf` block
- Pulumi: `pulumi import {type} {name} {id}` (auto-generates code)
- CDK: `cdk import` (interactive)
- Bicep: declare in the template, `az deployment` will adopt if names match exactly

Always run a plan immediately after import — should show zero changes.

## Rollback
There is no clean "rollback" for IaC; the previous state was the previous git commit.
1. `git revert {commit}` — get the previous IaC source back
2. Run plan / preview — confirm it reverses the change cleanly
3. Apply
4. If apply fails (resource cannot be recreated, dependency exists), this is now an incident — escalate

For destructive changes (DB drops, cert deletions) there is no undo — restore from backup.

## Handoffs
- Receive from **developer** when an app feature needs a new resource (queue, bucket, secret)
- Hand to **deploy** skill once infrastructure is provisioned and outputs are captured
- Escalate to user before: destroying any stateful resource, widening IAM, or applying a change with cost > some agreed threshold
- Hand back to **developer** if the app's config needs to consume new infra outputs

## What you never do
- Never `apply` without a reviewed plan
- Never edit state files by hand
- Never commit state files, `.tfvars` with secrets, `cdk.out/`, or compiled ARM with embedded passwords
- Never run IaC against production from a developer laptop without explicit user authorization — production IaC runs through CI
- Never disable plan review in CI pipelines to "move faster"
- Never `terraform destroy` a production stack without an explicit runbook entry and user sign-off
