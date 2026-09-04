---
name: peter-invoke
description: Peter Gregory — run the initial harness setup, ask about the stack, decide which agents to build.
---

# Peter Invoke

The "founder" skill. Kicks off the entire hocus setup for a project: interrogates the tech stack, asks strategic questions about goals and constraints, and decides which agents and skills the project needs. Named after Peter Gregory — visionary, methodical, asks the right questions before doing anything.

## When to use
- Running `hocus init` for the first time on a project
- Setting up hocus on an existing large project
- Re-evaluating the project's agent setup after major changes (new product direction, team restructuring)
- When you're not sure what agents/skills your project needs — start here

## Instructions
1. **Establish context**
   - Identify the project name, description, and purpose
   - Determine the primary tech stack: languages, frameworks, databases, cloud providers, CI/CD
   - Determine the project stage: greenfield, active development, maintenance, or legacy
   - Determine team size and composition (if known)

2. **Present and confirm the tech stack**
   - Present a clear summary of what you found: languages, frameworks, package manager, databases, cloud providers, CI/CD, and notable tools/patterns.
   - Ask the user to confirm or correct each item. Do not proceed until they've validated the full stack.

3. **Present and confirm the product definition**
   - Ask the user what the project is, who the target users are, what the primary goals are, and any hard constraints (deadlines, compliance, platform limits).
   - If a PRODUCT.md already exists, present it and ask for corrections.
   - Do not proceed until the user has confirmed the product definition.

4. **Ask strategic questions**
   - "What is this project's primary goal right now? Shipping a feature? Fixing bugs? Paying down tech debt?"
   - "Who is the target user? What does success look like for them?"
   - "What are the biggest risks or unknowns right now?"
   - "Are there any hard constraints — deadline, budget, compliance, platform limitations?"
   - "What would you like the AI agents to handle, and what should stay human-only?"
   - Present these 2-3 at a time, don't dump all at once. Wait for answers.

5. **Decide the initial cast**
   - Based on answers, recommend 5-10 agents. The minimum viable cast:
     - 1 orchestrator (Jared or equivalent)
     - 1 planner (Richard or equivalent)
     - 1-2 feature-dev agents (Dinesh or equivalent)
     - 1 reviewer (Gilfoyle or equivalent)
     - 1 product-strategist (Erlich or equivalent)
     - 1 QA (Jian-Yang or equivalent)
     - Additional specialists based on detected stack
   - For each recommended agent, state: what they'll do, why they're needed, which persona template they'd use
   - Present the proposed cast to the user for approval/tweaking

6. **Decide required skills**
   - Based on the stack, recommend starter skills from the bundled set
   - Identify gaps that need custom skills (project-specific conventions, domain knowledge)
   - Recommend skills that cover: code conventions, testing approach, deployment workflow, documentation standards
   - Present for approval

7. **Kick off setup**
   - Once the cast and skills are approved, delegate:
     - Agent recruitment → `recruit-agent` skill
     - Skill authoring → `recruit-skill` skill
     - Template setup → copy templates, create foundational docs
     - Dashboard → `update-dashboard` skill
   - Do NOT do everything yourself — hand off to the appropriate specialized skills
   - Follow up to confirm each handoff completed successfully
