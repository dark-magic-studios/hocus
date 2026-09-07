---
name: add-harness-provider
description: Add a new LLM provider (OpenAI, Anthropic, Google, etc.) to the harness configuration.
---

# Add Harness Provider

Adds a new LLM provider to the project's harness configuration, enabling agents to use models from that provider. Handles API key setup, model selection, and provider-specific configuration.

## When to use
- You want to use a different LLM provider for certain agents (e.g., Claude for planning, GPT-4 for code generation)
- The project needs a fallback provider in case the primary is unavailable
- A new model from an existing provider should be added
- Setting up the harness for the first time — you need at least one provider

## Instructions
1. **Identify the target config**
   - Determine which tool(s) need the new provider: Cursor, Claude Code, OpenCode, Antigravity, or all
   - If unsure, default to all detected configs

2. **Supported providers**
   - OpenAI: models (gpt-4o, gpt-4o-mini, o3, o4-mini), API key via `OPENAI_API_KEY` env var
   - Anthropic: models (claude-sonnet-4-20250514, claude-haiku-3-5), API key via `ANTHROPIC_API_KEY` env var
   - Google: models (gemini-2.5-pro, gemini-2.5-flash), API key via `GOOGLE_API_KEY` env var
   - AWS Bedrock: region, model ARN, credentials via AWS profile or env vars
   - Azure OpenAI: endpoint, deployment name, API key
   - OpenRouter: unified API for many providers, API key via `OPENROUTER_API_KEY`
   - Ollama: local models, host URL (default `http://localhost:11434`)
   - Custom: any OpenAI-compatible endpoint (API key + base URL)

3. **Collect required information**
   - Ask the user which provider and specific model(s) they want
   - Ask if they already have an API key or need guidance on getting one
   - Ask about model preferences: speed vs. quality, cost constraints, context window requirements
   - For Ollama: ask which model to pull and run locally
   - For custom endpoints: ask for the base URL and any auth headers

4. **Configure the provider**
   - For Claude Code: update `.claude/settings.local.json` or the project's `.claude.json` with the model alias and provider
   - For Cursor: update `.cursor/config.json` or settings
   - For OpenCode: update `opencode.jsonc` with the provider and model configuration
   - For Antigravity: update `.agents/config.yaml` or equivalent
   - Configure model aliases if the tool supports them (e.g., `"fast" → claude-haiku-3-5`, `"smart" → claude-sonnet-4`)

5. **Security**
   - API keys should go in environment variables (`.env` file or shell profile), never committed to the repo
   - Add the key name to `.env.example` as a documentation stub
   - If the tool config requires inline keys, warn the user and suggest alternative
   - Ensure `.env` is in `.gitignore`

6. **Verify**
   - Test the provider with a simple prompt to confirm the API key works and the model responds
   - If verification fails, check: API key format, network access, model availability on the provider's side
   - Report success or failure with error details
