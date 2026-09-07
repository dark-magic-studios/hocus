---
name: recruit-skill
description: Detect domain knowledge gaps in a project and author new SKILL.md files to fill them.
---

# Recruit Skill

Creates new skills by identifying areas where the project's agents lack domain knowledge, conventions, or procedures. A skill is a reusable bundle of instructions — this skill teaches you how to write one.

## When to use
- Agents consistently produce subpar output in a specific domain (e.g., they write bad SQL)
- The project has unique conventions that aren't captured anywhere (e.g., "every React component must have a corresponding story file")
- A new technology has been introduced and agents need guidance on using it correctly
- You notice the same instructions being repeated in multiple prompts — they belong in a skill
- During initial setup: generate one skill per major technology or workflow

## Instructions
1. **Detect need**
   - Review the project's stack: what technologies, frameworks, and tools are in use?
   - Read existing PRs and issues: where do contributors (human or AI) consistently make the same mistakes?
   - Ask the user: "What knowledge would a new team member need to be productive on day one?"
   - Look at AGENTS.md and TASKS.md: are there tasks that require knowledge not covered by any skill?

2. **Scope the skill**
   - Each skill should cover exactly one domain. A skill called "react-frontend" is better than "frontend-development" — keep it focused.
   - If a domain is large, split it: "react-component-patterns", "react-testing", "react-performance"
   - Name the skill with a short, descriptive slug: `react-component-patterns`, `sql-optimization`, `ci-cd-pipeline`

3. **Write the SKILL.md**
   ```markdown
   ---
   name: <skill-slug>
   description: <one-line description of when an agent should load this skill>
   ---

   # <Display Name>

   <2-3 sentence overview of what this skill covers and why it matters>

   ## When to use
   <bullet or paragraph describing the exact situations where an agent should activate this skill>

   ## Instructions
   <step-by-step or structured reference material that the agent should follow>
   ```
   - Frontmatter must have exactly `name` (slug) and `description` (used by agents to decide relevance)
   - The body is free-form markdown. Convention is `## When to use` followed by `## Instructions`
   - Instructions can include code examples, decision trees, checklists, do/don't tables — whatever is most actionable

4. **Validate**
   - Does this skill duplicate or overlap with an existing one? Merge or differentiate.
   - Is the description concise enough for an agent to quickly decide "yes, load this" or "no, skip"?
   - Are the instructions specific to *this* project, or generic enough to be useful anywhere? Project-specific instructions belong in CLAUDE.md, not in a skill.
   - If the skill references project conventions (directory layout, naming), verify those conventions actually exist.

5. **Install and register**
   - Save the skill and install it: the skill `add` command or the init bulk-install will handle this
   - Add a reference in AGENTS.md so agents know this skill exists
   - Present new skills to the user for approval
