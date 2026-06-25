---
name: gavin-render-dashboard
description: Gavin — keep the aviomancy dashboard alive, rendered, and current. Display project status in a visually compelling way.
---

# Gavin Render Dashboard

Maintains and renders the project dashboard — the central visual display of project health, agent status, task progress, and activity. The dashboard is the public face of the project's AI operation. Named after Gavin Belson — presentation is everything.

## When to use
- The dashboard needs an initial render or refresh
- The current dashboard is stale (outdated data, broken links, missing sections)
- You want to add a new visualization or metric to the dashboard
- The dashboard doesn't reflect the current tooling or team structure
- You need to present the project to someone and the dashboard is the best overview

## Instructions
1. **Read the source data**
   - TASKS.md: task status distribution (counts per status)
   - AGENTS.md: agent registry
   - `.claude/agents/` and `.claude/skills/`: actual installed artifacts
   - MEMORY.md: recent decisions, knowledge entries
   - HARNESS_REPORT.md (if exists): tool config health
   - Recent git history: activity level, last commit date, branch activity

2. **Choose the render format**
   - **HTML dashboard** (`dashboard.html`): full visual dashboard with CSS, sections, color coding. Best for opening in a browser.
   - **Markdown dashboard** (`DASHBOARD.md`): lightweight, renders in any markdown viewer. Best for quick references.
   - If the project already has one or the other, update the existing format and optionally create the other.
   - Default to HTML for a polished experience, Markdown as a companion.

3. **Standard dashboard sections**
   - **Header**: project name, last updated timestamp, overall health badge (🟢 / 🟡 / 🔴)
   - **Team section**: table of agents with role, status (active/inactive/needs attention), and a brief description
   - **Skills section**: list of installed skills with descriptions
   - **Task board**: visual task distribution — cards or bars showing counts per status, with drill-down
   - **Activity feed**: recent commits, recent task completions, recent config changes
   - **Health panel**: config status per tool, MCP status, LLM provider status
   - **Quick actions**: links to run common commands (`aviomancy cast`, `aviomancy skill add`, etc.)

4. **HTML dashboard styling**
   - Clean, modern CSS (no framework needed — pure CSS grid/flexbox)
   - Dark theme as default, with auto-detection of system preference
   - Responsive: readable on desktop and mobile
   - Color coding throughout: 🟢 green for healthy, 🟡 amber for warning, 🔴 red for errors/outages
   - No JavaScript required for basic rendering (static HTML is fine)
   - File size under 50KB including inline CSS

5. **Update frequency**
   - For a one-off render: write the file and notify the user
   - For ongoing maintenance: set up a reminder or hook to re-render periodically
   - Suggest automation: a CI step, a cron job, or a post-merge hook that re-renders the dashboard
   - If the user wants it always fresh, recommend running `gavin-render-dashboard` as part of the deploy pipeline

6. **Presentation polish**
   - Ensure all links work (relative paths to TASKS.md, AGENTS.md, MEMORY.md)
   - Add a "Last rendered" timestamp so viewers know how current the data is
   - Handle empty states gracefully: "No tasks yet" not just an empty table
   - Include a footer with a link to the aviomancy docs
