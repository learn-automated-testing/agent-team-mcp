---
name: prd
description: Turns a rough idea into a clear Product Requirements Document with goals, user stories, acceptance criteria, and success metrics. Use when the user says "write a PRD", "spec this out", "I have an idea", "help me plan this feature", or before starting any new feature.
---

# Skill: prd

## Purpose
Turn a rough idea into a clear Product Requirements Document (PRD) — so the team and the AI know exactly what to build before a single line of code is written.

## When to trigger this skill
- User says "write a PRD", "spec this out", "I have an idea", "help me plan this feature"
- Before starting any new feature or app
- When an idea is vague and needs structure before handing to a developer or agent

## Prerequisites
- A rough idea — even a single sentence is enough to start
- Optional: user research, competitor examples, existing designs

## Steps

1. **Extract the idea through questions**
   Ask only what's missing — do not ask for everything upfront:
   - What problem does this solve? Who has this problem?
   - What does success look like? How will we know it worked?
   - What is explicitly out of scope for this version?
   - Any technical constraints? (existing stack, integrations, deadlines)

2. **Write the PRD using this structure:**

   ---

   ### Problem statement
   One paragraph. What is broken or missing today? Who is affected and how?

   ### Goal
   One sentence. What will be true when this is done?

   ### Users
   Who are the primary users of this feature? What do they need to accomplish?

   ### User stories
   Written as: "As a [user], I want to [action] so that [outcome]."
   - Cover the core happy path
   - Cover the most important edge cases
   - Mark each as: must-have / should-have / nice-to-have

   ### Functional requirements
   Numbered list of specific things the system must do.
   Be concrete: "The user can upload a profile photo up to 5MB" not "Users can upload photos."

   ### Non-functional requirements
   - Performance targets (page loads in < 2s)
   - Security requirements (all routes authenticated)
   - Accessibility (WCAG AA)
   - Browser/device support

   ### Out of scope
   Explicit list of what this version will NOT include. This prevents scope creep.

   ### Open questions
   Things that need a decision before or during build.

   ### Success metrics
   How will we measure if this worked? (e.g. "50% of users complete onboarding", "error rate < 0.1%")

   ---

3. **Review with the user**
   - Read back the goal and user stories
   - Ask: "Does this match what you had in mind?"
   - Resolve any open questions before handing to build

4. **Save the PRD**
   - Save to `docs/prd-[feature-name].md` in the project repo
   - Commit it: `git commit -m "docs: add PRD for [feature-name]"`

## Rules and constraints
- Never start writing code during this skill — spec first, build second
- Keep language plain — no jargon unless the user uses it
- Must-have stories only for v1. Push everything else to out of scope.
- If the user can't define success metrics, help them find one before finishing

## Output format
A complete markdown PRD document, ready to commit to the repo.
