---
name: recruit-agent
description: Scan a project and create new agent personas (.soul.md files) tailored to its specific needs.
---

# Recruit Agent

Creates new agent personas for a project by analyzing the project's stack, domain, and team structure. Ensures every major concern has a dedicated agent with a clear role, voice, and tool permissions.

## When to use
- The project lacks an agent for a critical concern (testing, deployment, security, etc.)
- The existing cast is too small for the project's complexity
- You need a specialist agent (e.g., "database-migration-agent") that the generalists shouldn't handle
- A new domain or service has been added to the project
- During initial setup after `aviomancy init` when proposing the cast

## Instructions
1. **Analyze the project**
   - Read package.json, tsconfig, Dockerfile, CI config, README, and any existing .soul.md files
   - Identify the major technical domains: frontend, backend, database, testing, infra, documentation, CI/CD
   - Identify the major workflow domains: planning, reviewing, deploying, monitoring, onboarding

2. **Identify gaps**
   - Compare the existing agents (from `.aviomancy/personas/` or `.claude/agents/`) against the project's needs
   - Note which domains have no dedicated agent
   - Group small/related domains that one agent can cover together

3. **Draft the new soul**
   - Use the same YAML frontmatter schema as the bundled personas:
     - `character`: lowercase slug, e.g. `api-specialist`
     - `display_name`: human-readable, e.g. `API Specialist`
     - `role`: from the standard set: `planner`, `orchestrator`, `feature-dev`, `reviewer`, `recruiter`, `qa`, `dumb-qa`, `product-strategist`, `ceremony-master`, `configurator`, `costs-cleaner`, `project-manager`, `founder`
     - `voice`: 2-4 word tone description
     - `glyph`: emoji or ASCII art badge (max 8 chars)
     - `triggers`: keywords that should invoke this agent
     - `tools`: array of allowed tools — default `[read, grep, glob]`, expand for implementation agents
   - Write the body following the persona template: **H1** with name/role, opening purpose paragraph, **## Responsibilities** (bulleted), **## Boundaries** (what it must NOT do), **## Manner** (voice/style guidelines)

4. **Validate before saving**
   - The slug is unique (no conflict with existing agents)
   - The role is one of the standard roles (or convincingly close)
   - Tool permissions are scoped to what the agent actually needs
   - Triggers don't overlap destructively with other agents (choose more specific triggers for specialists)
   - Present the draft to the user for approval before writing the file

5. **Write to `.aviomancy/personas/`**
   - Save as `<slug>.soul.md` in the project's `.aviomancy/personas/` directory
   - If the project has been initialized with `cast`, re-run `aviomancy cast` to compile the new agent for all target tools
