---
name: harness-report
description: Generate a comprehensive report on the current harness state — providers, MCPs, agents, skills, and configuration health.
---

# Harness Report

Generates a detailed report of the project's AI harness configuration: which providers are configured, which MCP servers are available, which agents and skills are installed, and the overall health of the setup.

## When to use
- Before making changes to the harness — understand the current state
- After significant setup work to verify everything is in place
- When troubleshooting why an agent can't access something
- When onboarding new team members — give them the full picture
- Periodically as a maintenance check

## Instructions
1. **Scan all config locations**
   - Cursor: `.cursor/rules/`, `.cursor/mcp.json`
   - Claude Code: `.claude/agents/`, `.claude/skills/`, `.claude/settings.local.json`
   - OpenCode: `.opencode/` or `opencode.jsonc`
   - Antigravity: `.agents/`
   - aviomancy: `.aviomancy/personas/`

2. **Report structure**
   ```
   # Harness Report — <project>

   Generated: <date>

   ## Overview
   - Tools configured: Cursor ✅ / Claude Code ✅ / OpenCode ❌ / Antigravity ✅
   - Total agents: X (across Y roles)
   - Total skills: Z
   - MCP servers: W
   - LLM providers: V

   ## Agents
   | Agent | Role | Tools | Present In |
   |---|---|---|---|
   | richard | planner | read,grep,glob | Claude Code, Cursor, Antigravity |
   | jared | orchestrator | read,grep,glob,edit,write | Claude Code, Cursor |
   | ... | ... | ... | ... |

   ## Skills
   | Skill | Description | Present In |
   |---|---|---|
   | deslopify | Strip boilerplate... | Claude Code, Antigravity |
   | ... | ... | ... |

   ## MCP Servers
   | Name | Type | Status | Notes |
   |---|---|---|---|
   | github | @modelcontextprotocol/server-github | ✅ | Token set via GITHUB_TOKEN |
   | linear | @modelcontextprotocol/server-linear | ⚠️ | Missing API key |

   ## LLM Providers
   | Provider | Models | Default | Status |
   |---|---|---|---|
   | Anthropic | claude-sonnet-4, claude-haiku-3-5 | claude-sonnet-4 | ✅ |
   | OpenAI | gpt-4o, gpt-4o-mini | — | ✅ |

   ## Health Issues
   - ⚠️ OpenCode config not found — run `aviomancy cast` to generate
   - ❌ Linear MCP missing API key — set LINEAR_API_KEY in .env
   - ℹ️ 3 skills installed but never referenced in AGENTS.md — agents might not load them
   ```

3. **Health checks**
   - Each agent listed in AGENTS.md has a corresponding config file in at least one tool
   - No orphaned agent configs (files without registration in AGENTS.md)
   - MCP configs have valid JSON syntax
   - API keys referenced in configs exist as environment variables
   - No conflicting tool configurations (different agents with same triggers in the same tool)
   - Skills referenced in AGENTS.md actually exist on disk

4. **Output**
   - Write the report to `HARNESS_REPORT.md` in the project root
   - Also print a summary to the console
   - If any health check fails, flag it prominently with recommended actions
