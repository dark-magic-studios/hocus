---
name: laurie-resolve-config
description: Laurie — reconcile Cursor, Claude Code, OpenCode, and Antigravity configs so they all agree on agents, skills, and MCPs.
---

# Laurie Resolve Config

Reconciles configuration across all four AI tool targets. Detects when Cursor has an agent that Claude Code doesn't, when OpenCode has a different MCP list, when Antigravity is missing a skill — and resolves the differences by applying a merge strategy.

## When to use
- After running `sync-harness-config` if it reported drifts
- One tool's agents are out of sync with another's
- An agent works in Cursor but not in Claude Code (likely a config mismatch)
- After merging a branch that touched multiple tool configs
- When ci/cd or team members have modified one config but not others
- During onboarding or handover — ensure all configs are aligned

## Instructions
1. **Read all four configs**
   - Cursor: `.cursor/rules/*.mdc` (agents as rules), `.cursor/mcp.json` (MCPs)
   - Claude Code: `.claude/agents/*.md` (agents), `.claude/skills/*/SKILL.md` (skills), `.claude/settings.local.json` (MCPs + provider)
   - OpenCode: `.opencode/agent/*.md` or `opencode.jsonc` (agents + config)
   - Antigravity: `.agents/agents/*/agent.md` (agents), `.agents/skills/*/SKILL.md` (skills), `.agents/*.json` (MCPs)
   - Source of truth: `.hocus/personas/*.soul.md` (canonical agent definitions)

2. **Compare agent lists**
   - Build a matrix: agent slug × tool (present / absent / different content)
   - For agents in the source of truth but missing in a tool → flag as missing
   - For agents present in a tool but not in the source of truth → flag as orphaned
   - For agents present everywhere but with different content → flag as diverged

3. **Compare MCP configs**
   - List MCP servers by name across all tools
   - Flag servers present in one tool but not another
   - Flag servers with the same name but different commands or arguments
   - Flag servers with the same name and command but different environment variables (missing tokens, different paths)

4. **Resolve by strategy**
   - **Missing agent**: Run `hocus cast` to recompile all personas for all detected targets
   - **Orphaned agent (in tool but not in source of truth)**: Ask the user: keep it (and add to source of truth) or remove it
   - **Diverged content**: The canonical content is in `.hocus/personas/` — overwrite tool-specific copies
   - **Missing MCP**: Add to the missing tool's config using the canonical definition (most complete version wins)
   - **Diverged MCP**: Present the differences to the user for manual resolution. Auto-merge only if the only difference is that one has more env vars than the other (merge the superset)
   - **Unused skill file**: Keep it — skills are inert unless referenced by an agent

5. **Report and confirm**
   ```
   # Config Reconciliation Report

   ## Agents
   - ✅ All 6 agents present in all 4 tools
   - ⚠️ "database-agent" found in Cursor but not in .hocus/personas — orphaned
   - 🔄 "deploy-agent" had different tools in OpenCode (had "bash" extra) — overwritten from SOUL.md

   ## MCPs
   - ✅ GitHub and Linear present in all tools
   - ⚠️ "sqlite" MCP configured in Claude Code but not in Cursor — added to Cursor
   - ❌ "web-search" has different API keys across tools — needs manual review

   ## Skills
   - ✅ All 4 skills present in both .claude/skills/ and .agents/skills/
   ```
   - Present to the user for confirmation before applying destructive changes (orphan removal, overwrites)
   - Non-destructive changes (adding missing entries) can be applied automatically with a warning
