---
name: recruit-assessment
description: Audit the current agent and skill configuration — identify gaps, redundancies, and improvement opportunities.
---

# Recruit Assessment

Audits the existing team of agents and skills, evaluating coverage, overlap, and missing capabilities. Produces a concrete action plan for recruiting new agents or skills and deprecating or merging redundant ones.

## When to use
- You're not sure if the current agent roster covers all project needs
- Before or after adding significant new functionality to the project
- As a periodic health check (e.g., every sprint)
- When onboarding new contributors — ensure the automated documentation/agent setup is comprehensive
- When the project has accumulated several agents and skills without a formal review

## Instructions
1. **Inventory**
   - List all agents: read `.hocus/personas/*.soul.md` or `.claude/agents/*.md`
   - List all skills: read `.agents/skills/*/SKILL.md` and `.claude/skills/*/SKILL.md`
   - For each agent, record: slug, role, triggers, tools
   - For each skill, record: slug, description

2. **Evaluate coverage**
   - Map each project domain (frontend, backend, testing, CI/CD, docs, infra, security, planning, review, etc.) to the agent that covers it
   - Map each domain to the skills that provide domain knowledge for it
   - Identify domains with no agent → **gaps** (needs new agent recruitment)
   - Identify domains with no skill → **knowledge gaps** (needs new skill recruitment)

3. **Detect redundancy**
   - Two agents with overlapping triggers that would fire on the same request → merge or re-scope
   - Two skills with similar descriptions → merge or disambiguate
   - An agent whose triggers never fire because a broader agent catches everything first → specialize the triggers
   - A skill that references a technology no longer in the project → deprecate

4. **Evaluate quality**
   - Are the agent voices distinct enough, or do they all sound the same?
   - Do the skill instructions provide enough detail to actually guide an agent, or are they stubs?
   - Are tools permissions too broad (security risk) or too narrow (can't do the job)?
   - Check for skills that are never invoked: no agent trigger references them, no task ever calls on them

5. **Produce the report**
   ```
   # Team Assessment — <date>

   ## Agents (X total)
   - ✅ <slug> — covers <domain> (tools: <list>)
   - ⚠️ <slug> — overlaps with <other> on triggers <list>
   - 🚫 <slug> — never triggered, consider deprecating

   ## Skills (Y total)
   - ✅ <name> — provides <knowledge domain>
   - ⚠️ <name> — too generic, tighten scope
   - 🚫 <name> — technology no longer in use

   ## Gaps
   - No agent for: <domain>
   - No skill for: <technology/workflow>

   ## Recommendations
   1. Create agent <slug> to cover <domain>
   2. Create skill <name> for <knowledge domain>
   3. Merge <agent A> and <agent B>
   4. Deprecate <skill name>
   ```
   - Present the report to the user and ask for approval on each recommendation
   - Offer to execute the recruitment or removal after approval
