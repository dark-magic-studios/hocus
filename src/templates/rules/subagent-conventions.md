---
trigger: model_decision
description: Conventions, schemas, tool mappings, and directory structures for custom subagents in Antigravity and cross-harness compilers.
---

# Subagent & Custom Agent Nomenclature

Antigravity natively discovers custom subagents from `.agents/agents/<agent_name>/agent.md` (and globally from `~/.gemini/config/agents/<agent_name>/agent.md`).

## 1. Directory Structure

Every Antigravity custom subagent must reside in its own subdirectory named after the agent slug:

```text
.agents/agents/
├── <agent_name>/
│   └── agent.md
```

## 2. Frontmatter Specification

`agent.md` files must contain standard YAML frontmatter:

```yaml
---
name: <agent_name>
description: <concise role summary and triggers>
model: inherit
subagent: true
tools:
  - view_file
  - list_dir
  - grep_search
  - run_command
---

# Agent System Instructions

<Persona instructions and role boundaries>
```

- `name`: Must match the directory name (kebab-case slug).
- `description`: Explains what the subagent does and when to invoke it. Used by orchestrators for subagent delegation.
- `model`: Model tier to use (`inherit`, `flash`, `pro`). Defaults to `inherit`.
- `subagent`: Set to `true` so Antigravity marks it as an invocable subagent.
- `tools`: Explicit list of tools granted to the agent. If omitted, ambient tools are inherited.

## 3. Tool Mapping Contract

Generic tools declared in `SOUL.md` map to Antigravity primitives:
- `read` -> `view_file`, `list_dir`
- `grep` -> `grep_search`
- `glob` -> `find_by_name`
- `edit` -> `replace_file_content`, `multi_replace_file_content`
- `write` -> `write_to_file`
- `bash` / `shell` -> `run_command`, `manage_task`

## 4. Strict Separation: Agents vs Rules

- **Subagents (`.agents/agents/`)**: Represent *who* does the work (autonomous personas with independent contexts, system instructions, and toolsets).
- **Rules (`.agents/rules/`)**: Represent *how* work must be done (ambient coding standards, API constraints, testing guidelines, and safety policies).
- **Never place subagent persona definitions in `.agents/rules/`.**
