---
name: laurie-fix-conflict
description: Laurie — resolve format conflicts between Cursor, Claude Code, OpenCode, and Antigravity config files that have incompatible schemas or syntax.
---

# Laurie Fix Conflict

Resolves conflicts between the four AI tool configuration formats when they have incompatible schemas, syntax errors, or structural differences. More surgical than `laurie-resolve-config` — this handles file-level conflicts (JSON parsing errors, YAML schema violations, conflicting array merges, etc.).

## When to use
- A config file has a JSON syntax error and won't load
- Two tools require different data shapes for the same config concept (e.g., MCP transport format)
- A merged branch introduced conflicting config values
- After a tool update that deprecated a config field
- `laurie-resolve-config` reported conflicts that can't be auto-merged
- A tool refuses to start and the error points to a config file

## Instructions
1. **Identify the conflict**
   - Parse each config file. If it fails to parse, note the syntax error and location.
   - Compare the semantic content across files, not just the text.
   - Common conflict types:
     - **Syntax errors**: trailing commas in JSON, tabs vs spaces in YAML, unquoted strings
     - **Schema drift**: same config field accepted by Cursor but rejected by Claude Code (or vice versa)
     - **Array ordering**: MCP servers listed in different order, tools treat order differently
     - **Environment variable syntax**: `$VAR` vs `${VAR}` vs `{{VAR}}` across tools
     - **Comment stripping**: some tools strip comments, others preserve them — causing false diffs
     - **Deprecated fields**: a tool update removed support for `model` -> now it's `defaultModel`

2. **Fix syntax errors**
   - JSON: remove trailing commas, add missing quotes, fix unescaped strings, close brackets
   - YAML: fix indentation (convert tabs to spaces), quote strings with special chars, fix boolean confusion (`yes`/`no` vs `true`/`false`)
   - Validate with `—` after fixing (try parsing again)
   - Never auto-fix a syntax error that changes the semantics (e.g., removing a valid field because it looks wrong)

3. **Resolve schema drift**
   - Identify the equivalent field names in each tool's schema
   - Map them:
     - MCP servers: `.claude/settings.local.json.mcpServers` → `.cursor/mcp.json` (different nesting)
     - Agent definitions: `.claude/agents/*.md` frontmatter → `.cursor/rules/*.mdc` frontmatter → `.opencode/agent/*.md` frontmatter
   - Transform from one format to another where the schema differs
   - If a tool doesn't support a feature (e.g., Cursor rules don't have a `tools` field like Claude agents do), drop the unsupported field rather than leaving a broken entry

4. **Merge conflicts (git)**
   - If the conflict arose from a git merge, read both sides (theirs and ours)
   - Look for actual semantic differences vs. cosmetic differences (whitespace, ordering)
   - Where both sides added different MCP servers: keep both
   - Where one side modified and the other deleted: ask the user
   - Where both sides modified the same field: present both versions with context
   - After resolving, validate the merged file parses correctly

5. **Handle deprecations**
   - If a tool update deprecated a field, migrate to the new field name
   - Keep the old field as a fallback if the tool still reads it (backward compat)
   - Log a warning about the deprecated field so the user knows to eventually remove it

6. **Output**
   - For each conflict, describe: file, field, nature of conflict, resolution applied
   - If any conflict could not be auto-resolved, present it to the user with recommended actions
   - After all fixes, run validation on each affected config file
