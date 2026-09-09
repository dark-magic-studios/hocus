---
trigger: always_on
description: Core architectural boundaries, single-source-of-truth persona models, and multi-agent harness compilation pipeline for Hocus.
---

# Hocus Project Architecture & System Boundaries

Hocus is a multi-agent harness generator. It compiles a single persona specification (`SOUL.md`) into native agent and rule formats across six AI coding environments: Claude Code, OpenCode, Cursor, Antigravity, Command Code, and GitHub Copilot.

## 1. Single Source of Truth

- **Canonical Personas**: Defined in `.hocus/personas/*.soul.md` after init; bundled sources live in `src/personas/*.soul.md` using role-based filenames (`planner.soul.md`, `orchestrator.soul.md`, …).
- **Schema**: Validated by `src/schema/soul.ts` (`character`, `display_name`, `role`, `voice`, `glyph`, `triggers`, `tools`, `aliases: { valley, occult }`).
- **Role mapping**: `BASE_AGENT_TO_VALLEY` in `src/utils/cast.ts` maps bundled role slugs to cast keys (e.g. `planner` → `richard`, `reviewer` → `gilfoyle`).
- **Cast Types**:
  - `valley`: Silicon Valley persona names (`richard`, `gilfoyle`, `dinesh`, `jared`, `erlich`, etc.)
  - `wizard`: Occult / Wizard persona names (`merlin`, `zoroaster`, `roger-bacon`, `midas`, etc.)
  - Switching casts rewrites installed filenames and frontmatter while preserving canonical aliases.

## 2. Target Compilation Pipeline (`src/compilers/`)

Each compiler in `src/compilers/` transforms a `SoulFile` into a target-native format:

| Target | Destination Path | Format & Conventions |
| :--- | :--- | :--- |
| **Antigravity** | `.agents/agents/<slug>/agent.md` | Markdown with YAML frontmatter (`name`, `description`, `model`, `subagent: true`, `tools`) and `# Agent System Instructions`. |
| **Claude Code** | `.claude/agents/<slug>.md` | Markdown with YAML frontmatter (`name`, `description`, `tools`, optional `model`). |
| **OpenCode** | `.opencode/agent/<slug>.md` | Markdown with YAML frontmatter (`description`, `mode: subagent`, optional `model`). |
| **Codex** | `.codex/agents/<slug>.toml` | TOML custom-agent config (`name`, `description`, `developer_instructions`, optional `model`). Codex discovers repo skills from `.agents/skills/`. |
| **Cursor** | `.cursor/agents/<slug>.md` | Markdown with YAML frontmatter (`name`, `description`, optional `model`). |
| **Command Code** | `.commandcode/agents/<slug>.md` | Markdown + Taste compatibility section baked into prompt. |
| **GitHub Copilot** | `.github/agents/<slug>.agent.md` | Markdown with YAML frontmatter (`name`, `description`, `tools`, optional `model`). Skills live in `.github/skills/`. |

## 3. Directory Responsibilities

- `.agents/agents/<name>/agent.md`: Native subagent definitions for Antigravity.
- `.agents/rules/*.md`: Workspace rules, coding guidelines, and safety constraints for Antigravity (NEVER place subagent personas here).
- `.agents/skills/<name>/SKILL.md`: Open-standard skills shared across harnesses.
- `.github/agents/<slug>.agent.md`: Native custom agents for GitHub Copilot.
- `.hocus/_potions/*.md`: Active feature battle plans drafted by planners and executed by orchestrators.
- `src/tui/`: Interactive command deck built with Ink and React 19.
- `dashboard.html`: Live visualization of project status, agents, potions, skills, and target readiness.
