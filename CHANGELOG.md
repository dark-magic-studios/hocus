# Changelog

## [0.4.0] — 2026-09-23

### 🚀 Major Features
- **Interactive Installation Wizard**: We shipped a guided TUI for `hocus init` — pick your cast (Wizards vs. Silicon Valley), providers, plugin vs. solo layout, symlink vs. copy, and runner in one glorious flow. CLI flags still lock steps when you already know what you want. Onboarding went from README-diving to button-mashing.

### ✨ Enhancements
- **Commands finally documented**: We overhauled the README to cover `upgrade`, `recast`, and `absorb` — including upgrade's `.new` sidecar and manifest behaviour. No more tribal knowledge.
- **Node 22 baseline + 22/24 CI matrix**: We upgraded internal systems for cutting-edge performance and honesty — Ink 7 needs Node 22, so we stopped pretending 18/20 would work.

### 🐛 Bug Fixes
- **Soul validation surfaces real errors**: We eliminated the misleading "soul not found" for malformed souls. `hocus add` now throws the actual validation error when a candidate exists but fails checks.
- **Selected model is actually used**: We eliminated phantom model labels in TUI chat — `claude`, `agy`, and `copilot` now pass `--model` with verified IDs. `opencode` collapses to one honest `opencode run` entry.
- **Shell-injection hole in chat builtins**: We obliterated a command-injection failure mode (`/test foo; rm -rf ~` ran a second command). POSIX now spawns without a shell; Windows quotes every arg for cmd.exe.
- **Codex TOML output**: We eliminated invalid TOML for regexes, Windows paths, and trailing quotes. Backslashes, control chars, and quote runs are now escaped and round-trip via `tomllib`.
- **Upgrade stops eating your edits**: We rebuilt upgrade for the next generation — hashes in `.hocus/upgrade-manifest.json`, pristine files update, edited files are kept with the bundle beside them as `<file>.new` unless `--force`. Scope flags (`--no-personas` / `--no-skills`) actually work now.
- **Init stops nuking your MCP servers**: We eliminated config-wipe on re-init — `.cursor/mcp.json`, `.opencode/opencode.json`, and `.agents` MCP files are now merged (your entries win, idempotent). Also squashed a broken `context7` package (`@anthropic-ai/context7` → `@upstash/context7-mcp`) and migrated stale entries.
- **Invisible OpenCode agents**: We eliminated undiscovered agents after scaffolding by retiring the unsupported `mode: subagent` frontmatter.

### 🔧 Internal
- Retired generated `_spells/` from git (already gitignored, package-excluded, stays on disk).
- Bumped to 0.4.0.

### 💥 Breaking Changes
- We now require Node >=22 (was >=18). Ink 7 requires it — installs on 18/20 succeeded then crashed. Sorry for the disruption. CI now tests 22 + 24. Migrate: `nvm install 22` / upgrade your image.
