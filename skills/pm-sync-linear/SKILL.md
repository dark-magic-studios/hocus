---
name: pm-sync-linear
description: Query Linear via MCPs, confirm with the user, then update TASKS.md to match the canonical Linear state.
---

# PM Sync Linear

Bridges Linear (project management) and the project's TASKS.md. Queries Linear via MCP for current issues, compares against the local TASKS.md, presents the diff to the user for confirmation, then updates TASKS.md to match.

## When to use
- Linear has been updated (issues moved, assigned, completed) and TASKS.md is stale
- You want to pick up your next task — sync to see what's assigned to you
- Before sprint planning or review — ensure TASKS.md reflects Linear's current state
- After a Linear automation or webhook may have changed issue states
- When you suspect the two sources of truth have diverged

## Instructions
1. **Verify Linear MCP is available**
   - Check if a Linear MCP server is configured in the project's MCP configuration
   - If not available: inform the user, suggest setting it up with `add-harness-mcp`, and abort
   - If available: proceed

2. **Query Linear**
   - Fetch issues assigned to the current project, filtered by active sprint or status
   - For each issue, capture: id (e.g., `ENG-123`), title, status, assignee, priority, labels
   - Note the last updated timestamp for each issue

3. **Read local TASKS.md**
   - Parse TASKS.md into a structured list: task name, status, owner, notes
   - If the task has a Linear ID in its notes (e.g., `[ENG-123]`), match it to the Linear issue

4. **Compute the diff**
   - Issues in Linear but not in TASKS.md → **new tasks to add**
   - Issues in TASKS.md but not in Linear → **tasks to remove** (they were likely deleted or moved to another project)
   - Issues with different statuses → **tasks to update**
   - Issues with changed assignees → **tasks to reassign**
   - Present the diff to the user as a clear list of proposed changes

5. **Confirm with user**
   ```
   Proposed changes to TASKS.md:
   ➕ Add: ENG-124 "Add auth middleware" (In Progress, assigned to you)
   ✅ Move to Done: ENG-120 "Set up CI pipeline"
   🔄 Update: ENG-118 "Design API schema" — status changed from In Progress to Review
   ❌ Remove: "Write docs" — not found in Linear (was it deleted?)
   ```
   - Wait for user approval before making any changes
   - If the user rejects a change, keep the TASKS.md entry as-is but note the discrepancy

6. **Update TASKS.md**
   - Apply the approved changes to TASKS.md
   - Maintain the existing TASKS.md format — preserve task ordering, sections, and any non-Linear tasks the team added manually
   - Preserve manual notes that don't have a Linear counterpart
   - After updating, confirm the final state to the user

7. **Handle conflicts**
   - If a task was modified both in Linear and in TASKS.md since the last sync, flag it as a conflict for manual resolution
   - Do not auto-resolve conflicts — present both versions and let the user choose
