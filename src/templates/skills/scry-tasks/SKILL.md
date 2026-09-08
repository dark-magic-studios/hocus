---
name: scry-tasks
description: Divine and reconcile TASKS.md against external issue trackers (Linear, GitHub Issues/Projects, Jira) via MCPs, or local offline sources (Obsidian vaults, local directories). Prompts for confirmation before applying changes and assists with MCP setup.
---

# Scry Tasks (Cornelius Agrippa / Jared)

> *"The grimoire reflects the realm; when the realm shifts, scry the truth and align the ledger."*

Bridges project trackers (**Linear**, **GitHub Issues/Projects**, **Jira**) or **offline local sources** (Obsidian vaults, project notes, local Markdown directories) with your local `TASKS.md`. Scries current tickets and status via MCP or direct filesystem inspection, compares against the local `TASKS.md`, presents a clear diff to the user for confirmation, and updates `TASKS.md` while preserving manual notes, custom sections, and formatting.

If an external tracker is chosen but its MCP server is not yet configured, delegates to the `add-harness-mcp` skill to set it up. If an offline or local source is chosen, prompts the user to point to the directory or file and syncs directly.

## When to use
- External tickets (Linear, GitHub Issues, Jira) have moved, been assigned, or completed, and local `TASKS.md` is stale.
- You want to pick up your next task — sync to see what is currently assigned or ready.
- Before sprint planning, weekly reviews, or creating release notes.
- You track personal or project tasks in an offline Markdown directory or Obsidian vault and want to synchronize them with your repository's `TASKS.md`.
- You suspect external state and local `TASKS.md` have diverged.

## Supported Sources of Truth
1. **Linear** (via Linear MCP or OAuth tool)
2. **GitHub Issues & Projects** (via GitHub MCP)
3. **Jira** (via Jira / Atlassian MCP)
4. **Local / Offline Markdown** (direct filesystem access to Obsidian vault, directory of markdown files, or local task ledger)

---

## Instructions

### 1. Identify Source of Truth
- Check the invocation context or command arguments (e.g. `/scry-tasks linear`, `/scry-tasks github`, `/scry-tasks local <path>`).
- If not specified, inspect the header of `TASKS.md` (e.g. `> Sources: [[Linear]] ...` or `> Source: GitHub`).
- If no source is specified or detected, ask the user:
  - **Linear**
  - **GitHub Issues / Projects**
  - **Jira**
  - **Local / Offline Directory** (Obsidian vault or local notes folder)

---

### 2. Verify Access or Delegate to `add-harness-mcp`

#### A. External Trackers (Linear, GitHub, Jira)
- Check if the corresponding MCP tools are available:
  - **Linear**: `list_issues`, `save_issue`, etc.
  - **GitHub**: `get_issue`, `list_issues`, etc.
  - **Jira**: `jira_search`, `get_issue`, etc.
- **If the MCP server is missing or disconnected**:
  - Do not manually duplicate MCP setup configuration here.
  - Delegate setup to the **`add-harness-mcp`** skill:
    - If running in an agent harness: invoke `add-harness-mcp` specifying the provider (`linear`, `github`, or `jira`).
    - If prompting the user: inform them that the MCP is not yet configured and suggest running `/add-harness-mcp <tracker>`.
    - Once the MCP is configured and verified, resume `/scry-tasks`.

#### B. Local / Offline Sources (Obsidian / Directory)
- No external MCP is required.
- Ask the user to point directly to the directory or file (e.g. `~/COWORK/TASKS.md`, `~/vault/tasks/`, or relative path `./notes`).
- Inspect and read files directly using standard filesystem tools.

---

### 3. Query the Source
Retrieve tasks from the target source:
- **Linear**: Query issues filtered by active project, cycle/sprint, or status (`In Progress`, `Todo`, `In Review`, `Done`).
- **GitHub**: Fetch open issues, milestone items, and recently closed issues for the repository.
- **Jira**: Query JQL for active sprint or user-assigned issues.
- **Local / Offline**: Parse markdown files in the specified directory:
  - Extract checkboxes `- [ ]` and `- [x]`.
  - Extract tags (`#todo`, `#dev`, `#blocked`), priority markers (`🔴`, `🟡`), due dates, and project headings.

Normalize each item into a common record:
```typescript
{
  id: string;          // e.g. "LINEAR-101", "#123", "JIRA-42", or slugified title for local
  title: string;       // Task description
  status: string;      // "in_progress" | "up_next" | "backlog" | "review" | "done"
  assignee?: string;
  priority?: string;
  url?: string;
  labels?: string[];
  updatedAt?: string;
}
```

---

### 4. Read Local `TASKS.md`
- Parse the project's `TASKS.md` into structured sections:
  - `## In Progress`
  - `## Up Next` (or `### This week`, `### Dated`)
  - `## Backlog`
  - `## Done`
- For each entry, capture:
  - Checkbox state (`[ ]` vs `[x]`)
  - Title and bold category tags (e.g. `**Project #1** — ...`)
  - External tracker ID link if present (e.g. `[LINEAR-101](...)`, `[#102](...)`)
  - Associated notes, sub-bullets, and admonition warnings.
- **Crucial**: Note all **manual / local-only tasks** (items without external IDs or labeled personal/offline). These must NEVER be deleted or overwritten without explicit user request.

---

### 5. Compute the Reconciliation Diff
Compare the source of truth records against local `TASKS.md`:
- ➕ **New Tasks**: Exist in source but missing from `TASKS.md`.
- ✅ **Completed**: Closed or marked Done in source, but still unchecked in `TASKS.md`.
- 🔄 **Status Changes**: Issues whose state moved (e.g., Backlog → In Progress, In Progress → Review).
- 👤 **Reassigned**: Assignee changed.
- ⏸ **Unmatched / Deleted Upstream**: Items in `TASKS.md` with an external ID that no longer exist or were cancelled in the source.
- 🔒 **Preserved**: Offline, personal, or local-only notes remain completely intact.

---

### 6. Present Diff & Confirm with User
Display a categorized, human-readable summary before making any edits:

```markdown
### Proposed Scrying Adjustments for TASKS.md
Source: Linear (Project: Project #1)

➕ Add (2):
  - [ ] Project #1 — New Auth middleware [LINEAR-101] (In Progress, assigned to you)
  - [ ] Project #1 — Asset compression pass [LINEAR-102] (Up Next)

✅ Move to Done (1):
  - [x] Project #1 — Performance pass [LINEAR-89] (Closed upstream)

🔄 Update Status (1):
  - [ ] Project #1 — Service connector [LINEAR-95] (Moved from In Progress → Review)

⏸ Flagged / Missing Upstream (1):
  - [ ] Project #1 — Legacy audio bug [LINEAR-72] (Not found in Linear — keep or remove?)

🔒 Preserved 8 local-only tasks (personal todos, manual dev notes, etc.)
```

- **Wait for explicit user confirmation** before touching `TASKS.md`.
- If the user declines certain changes, adjust the plan and proceed only with approved items.

---

### 7. Update `TASKS.md`
- Apply the approved changes.
- Update header metadata:
  ```markdown
  > Sources: [[<Source Name>]] (Project) + Local Notes
  > Last synced: YYYY-MM-DD
  ```
- Retain exact Markdown conventions, headings, bold tags, wiki-links (`[[...]]`), and external links.
- Preserve task ordering and custom sub-bullets.

---

### 8. Conflict Handling
- If a task was modified in `TASKS.md` (e.g. notes appended locally) and also in the upstream tracker since last sync:
  - Present both versions side-by-side.
  - Ask the user which version to adopt or whether to merge notes.
  - Never silently overwrite local notes.
