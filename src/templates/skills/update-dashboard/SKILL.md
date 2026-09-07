---
name: update-dashboard
description: Regenerate the project dashboard with live status — agents, skills, tasks, and health metrics.
---

# Update Dashboard

Regenerates the project dashboard (dashboard.html or dashboard.md) to reflect the current state of the project: which agents are available, which skills are installed, task progress, and overall project health. The dashboard is the single-pane-of-glass for the project's AI-assisted development setup.

## When to use
- After `hocus init` completes — build the initial dashboard
- After adding or removing agents or skills
- After significant task progress (sprint done, milestone reached)
- When opening the dashboard and noticing it's out of date
- Before a demo or review — ensure stakeholders see accurate status

## Instructions
1. **Read current state**
   - Agents: list `.claude/agents/*.md` and `.hocus/personas/*.soul.md`
   - Skills: list `.claude/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md`
   - Tasks: parse TASKS.md into status buckets
   - Memory: note entry count and last modified date from MEMORY.md
   - Config: check which tool configs are present (Cursor, Claude Code, OpenCode, Antigravity)

2. **Build the dashboard content**
   ```
   # Project Dashboard — <project-name>

   Last updated: <date>

   ## Team
   | Agent | Role | Status |
   |---|---|---|
   | Richard | planner | ✅ |
   | Jared | orchestrator | ✅ |
   | Dinesh | feature-dev | ✅ |
   | ... | ... | ... |

   ## Skills (X total)
   - <skill-name> — <brief description>
   - ...

   ## Tasks
   - 🔄 In Progress: X
   - 📋 Planned: Y
   - ✅ Done: Z
   - ⏸️ Blocked: W

   ## Project Health
   - Configs found: Cursor ✅ / Claude Code ✅ / OpenCode ❌ / Antigravity ✅
   - Agents registered in AGENTS.md: matches actual count? ✅ / ⚠️
   - Skills installed: X
   - Memory entries: Y
   - Last TASKS.md update: <date>
   ```

3. **Render the dashboard**
   - For HTML dashboards: use the project's dashboard template (if any) or generate a clean standalone HTML file with basic CSS
   - For Markdown dashboards: write to DASHBOARD.md at the project root
   - Include a timestamp so readers know how fresh the data is
   - Use color coding: green for healthy, yellow for warnings, red for issues

4. **Indicators and warnings**
   - 🟢 All agents have corresponding entries in AGENTS.md, all configs detected
   - 🟡 Some agents lack entries in AGENTS.md, or a config is missing
   - 🔴 No agents found, or TASKS.md is more than 30 days stale, or configs are misconfigured
   - Show a "recommended action" line for each warning or red indicator

5. **Save and confirm**
   - Write the dashboard file (overwrite existing)
   - Report the file path and a one-line summary of the dashboard state to the user
