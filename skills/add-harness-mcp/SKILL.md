---
name: add-harness-mcp
description: Register a new MCP (Model Context Protocol) server in the harness configuration for one or more tools.
---

# Add Harness MCP

Adds a new MCP server to the project's configuration, giving agents access to external tools and data sources (databases, APIs, filesystems, Linear, GitHub, etc.). Handles configuration, authentication, and verification.

## When to use
- You need agents to query a database directly (SQL MCP)
- You need agents to interact with Linear, GitHub, Jira, or other project management tools
- You need agents to read/write files, search the web, run shell commands, or use other tools
- Setting up the harness for the first time — bootstrap the standard MCPs
- An agent needs access to a data source it currently can't reach

## Instructions
1. **Determine which tools need the MCP**
   - Cursor: `.cursor/mcp.json` (or per-project settings)
   - Claude Code: `.claude/settings.local.json` → `mcpServers` section
   - OpenCode: `opencode.jsonc` → MCP configuration
   - Antigravity: `.agents/mcp.json` or tool-specific config
   - If unsure, add to all detected configs

2. **Supported MCP types**
   - **Filesystem**: read/write access to project files (built into most tools, but may need explicit permissions)
   - **GitHub**: pull requests, issues, code search, reviews — requires GitHub token
   - **Linear**: issues, projects, sprints — requires Linear API key
   - **Database (SQLite/PostgreSQL/MySQL)**: direct read-only (or read-write) SQL access
   - **Web search**: DuckDuckGo, Tavily, Exa, or custom search API
   - **Web fetch**: fetch URLs, scrape content
   - **Custom**: any MCP-compatible server (npx, uvx, docker, or local binary)

3. **Collect configuration**
   - Ask the user which MCP server(s) they need
   - For each MCP, determine:
     - Command: `npx`, `uvx`, `docker`, or direct binary path
     - Arguments: package name, server name, flags
     - Environment variables: API keys, connection strings, tokens
     - Transport: stdio (default) or SSE (URL)
   - Common patterns:
     - `npx -y @modelcontextprotocol/server-github`
     - `npx -y @modelcontextprotocol/server-linear`
     - `uvx mcp-server-sqlite --db-path ./data.db`
     - `npx -y @anthropic-ai/mcp-server-filesystem /path/to/allowed/dir`

4. **Write the config**
   - Add the MCP server entry to each target tool's config file
   - Use the correct JSON structure for each tool (they vary slightly)
   - For Claude Code (`.claude/settings.local.json`):
     ```json
     {
       "mcpServers": {
         "github": {
           "command": "npx",
           "args": ["-y", "@modelcontextprotocol/server-github"],
           "env": {
             "GITHUB_TOKEN": "${GITHUB_TOKEN}"
           }
         }
       }
     }
     ```
   - For environment variables that reference secrets, use `${VAR_NAME}` syntax if the tool supports it, otherwise add to `.env` and source it

5. **Security**
   - File-based MCPs: restrict to the project directory unless broader access is explicitly requested
   - Database MCPs: prefer read-only unless write access is required
   - API tokens: store in environment variables, never inline in config
   - Warn the user about the security implications of each MCP (especially filesystem and shell)

6. **Verify**
   - Confirm the MCP server starts and responds to an `initialize` handshake
   - If using npx/uvx, ensure the package is available (it will be auto-installed on first run)
   - If verification fails: check PATH, network access, API key validity, JSON syntax in config
   - Report success or failure with diagnostic details
