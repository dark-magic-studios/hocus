---
name: project-update
description: Keep TASKS.md, MEMORY.md, and AGENTS.md current with the real state of the project.
---

# Project Update

Keeps the project's living documents synchronized with reality. After any significant change — a task completed, an agent added, a decision made — run this skill to update the canonical records.

## When to use
- After completing a task (update TASKS.md — move to done)
- After making a non-trivial decision (update MEMORY.md)
- After adding, removing, or renaming an agent (update AGENTS.md)
- After a PR is merged (update TASKS.md, potentially MEMORY.md)
- Before opening a new task or sprint (ensure the documents are accurate)
- When you realize the docs have drifted from reality

## Instructions
1. **Read current state**
   - Read TASKS.md, MEMORY.md, and AGENTS.md
   - Read the actual project state: what files exist, what branches are active, what issues/PRs are open
   - If using Linear or GitHub projects, query the API/MCP for the canonical task state

2. **Update TASKS.md**
   - Format: a markdown table or list with columns: Status, Task, Owner, Priority, Notes
   - Statuses: `🔄 In Progress`, `📋 Planned`, `✅ Done`, `⏸️ Blocked`, `🗑️ Cancelled`
   - Move completed tasks to a "Done" section at the bottom with a completion date
   - Add newly discovered work as `📋 Planned`
   - Update owner if reassignment occurred
   - Remove tasks that were cancelled or absorbed into other work
   - If nothing changed, note that and skip the rewrite

3. **Update MEMORY.md**
   - Add entries for architectural decisions, rationale for tech choices, lessons learned
   - Each entry should have: date, decision, context, consequence
   - Don't duplicate what's in TASKS.md or AGENTS.md — MEMORY.md is for *why*, not *what*
   - Prune entries that are no longer relevant (but move them to an "Archive" section rather than deleting)

4. **Update AGENTS.md**
   - Ensure the registry matches the actual agents in `.claude/agents/` and `.aviomancy/personas/`
   - Add new agents, remove decommissioned ones
   - Update agent descriptions if their scope changed

5. **Diff and confirm**
   - After editing, present a summary of changes to the user: "Updated TASKS.md: moved 2 tasks to Done, added 1 new task. Updated MEMORY.md: added decision about using SQLite. No changes to AGENTS.md."
   - Ask for confirmation before finalizing any destructive changes (deleting tasks, removing agents)
