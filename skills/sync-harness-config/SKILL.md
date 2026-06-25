---
name: sync-harness-config
description: Sync the harness configuration across all tool config files — keep Cursor, Claude Code, OpenCode, and Antigravity in agreement.
---

# Sync Harness Config

Ensures the AI tool configurations (Cursor, Claude Code, OpenCode, Antigravity) all agree on the same agents, skills, MCPs, and provider settings. Detects drift and brings them back into alignment.

## When to use
- After adding or removing an agent (re-run to keep tool configs in sync)
- After adding or removing a skill
- After changing MCP server configuration
- When you notice one tool works differently from another
- Periodically, as a health check — run `laurie-resolve-config` first for deeper reconciliation

## Instructions
1. **Detect which configs are present**
   - Cursor: `.cursor/rules/`, `.cursor/mcp.json`
   - Claude Code: `.claude/agents/`, `.claude/skills/`, `.claude/settings.local.json` (or `.claude.json`)
   - OpenCode: `.opencode/` or `opencode.jsonc`
   - Antigravity: `.agents/`
   - Note which are present and which are missing

2. **Identify the source of truth**
   - `.claude/agents/` is the canonical agent list (since Claude Code is the primary execution environment)
   - `.claude/skills/` is the canonical skill list
   - If those don't exist yet, use `.aviomancy/personas/` as the fallback source of truth
   - Note: skills are mirrored as-is (no per-tool compilation needed), so just ensure they exist in both `.agents/skills/` and `.claude/skills/`

3. **Sync each target**
   - For each target, check what agents/skills exist vs. what should exist
   - Add missing entries (run `aviomancy cast` to recompile all personas for all detected targets)
   - Remove stale entries (agents/skills that were deleted from the source of truth but remain in a target)
   - Update entries whose content has changed (recompile)

4. **MCP sync**
   - MCP configs are tool-specific and don't share a canonical source — but flag any MCP server that's configured in one tool but not another
   - Present mismatched MCP configs to the user for manual resolution

5. **Report**
   ```
   Config sync complete:
   ✅ Cursor: 5 agents, 3 skills — up to date
   ✅ Claude Code: 5 agents, 3 skills — up to date
   ⚠️ OpenCode: not configured (no .opencode/ directory found)
   ✅ Antigravity: 5 agents, 3 skills — up to date
   ```
