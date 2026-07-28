# Hocus

A multi-agent harness generator. Write one persona once — a `SOUL.md` file —
and compile it into the native agent or rule format for Claude Code,
OpenCode, Cursor, and Antigravity.

The cast that ships with it borrows wizard names from history and myth —
Merlin plans, Roger Bacon orchestrates, Flamel implements, Zoroaster
reviews, and so on. Each persona also keeps aliases for the original
*Silicon Valley* cast and an earlier occultist recast — toggle them on
the dashboard with `?cast=valley` or `?cast=occult`. Rename or replace
any persona — the harness doesn't care what an agent is called, only that
it has a role, a voice, and a body of instructions.

## Why this exists

The four tools above don't share a config format, but they've converged
more than you'd expect:

| Target | Where personas live | Notes |
|---|---|---|
| **Claude Code** | `.claude/agents/<slug>.md` | Markdown + YAML frontmatter, invoked via the Task tool or `@mention`. |
| **OpenCode** | `.opencode/agent/<slug>.md` | Same shape, different frontmatter keys (`mode: subagent`). Folder name is singular vs. plural across sources — see [Known issues](#known-issues). |
| **Cursor** | `.cursor/rules/<slug>.mdc` | Cursor has no native subagent concept. Compiled as an "Agent Requested" rule instead — conditionally loaded by description, not directly invokable. |
| **Antigravity** | `.agents/rules/<slug>.md` | Antigravity's subagents are spawned dynamically by its orchestrator at runtime. This output is advisory context for that orchestrator, not a callable agent. |

Skills don't need this translation layer — `SKILL.md` is already a shared
open standard. One file at `.agents/skills/<name>/`, mirrored to
`.claude/skills/<name>/`, covers all four tools.

## Install

```bash
npm install
npm run build
npm link   # makes `hocus` available globally for local testing
```

## Commands

### `hocus init`

Run once, in the repo you want the harness in. Writes the main files if
they don't already exist (`AGENTS.md`, `CLAUDE.md`, `PRODUCT.md`,
`MEMORY.md`, `TASKS.md`, `_spells/`), copies the persona cast into
`.hocus/personas/` so they're editable per-project, compiles Claude
Code agents from them, installs the starter skill, and writes the initial
`dashboard.html`.

```bash
hocus init --name my-project
hocus init --dry-run   # preview personas and skills that would be installed
```

### `hocus cast`

The repo-aware step. Scans the current repo for language and framework
signals, tailors each persona with that context, and compiles for every
tool it detects in use (or whichever you pass explicitly). This is also
where OpenCode, Cursor, and Antigravity support gets added — `init` only
targets Claude Code.

```bash
hocus cast
hocus cast --targets claude-code,opencode,cursor,antigravity
hocus cast --dry-run   # preview compiled outputs and which compilers would run
```

### `hocus skill add <name>`

Installs a skill into `.claude/skills/` and `.agents/skills/`. Defaults to
the skills bundled with this package; pass `--from <path>` to install from
anywhere else.

```bash
hocus skill add example-skill
hocus skill add db-migration-safety --from ../dms-skills/skills/db-migration-safety
```

### `hocus sync`

Cheap refresh of `dashboard.html` from whatever's currently in
`.hocus/personas/` and `_spells/`. Doesn't touch any compiled agent
files. Run this often; run `cast` when something about the repo itself has
changed.

## The SOUL.md format

```markdown
---
character: gilfoyle        # lowercase, hyphenated slug (stable across recasts)
display_name: Zoroaster
role: reviewer
voice: cold, precise, contemptuous of inefficiency
glyph: "(o)"                # short badge, shown on the dashboard
                             # /^\ is the Hocus brand mark (see src/theme.ts), not a persona glyph
aliases:                    # optional — ignored by compilers, used by dashboard
  valley: Gilfoyle           # ?cast=valley
  occult: Mephisto           # ?cast=occult
triggers:
  - code review
  - pull request
tools: [read, grep, bash]   # optional, defaults to read/grep/glob
model: claude-sonnet-4-6    # optional
---

# Zoroaster — Reviewer

The body is the persona's actual instructions — responsibilities,
boundaries, voice. This is what gets compiled into each target's native
format.
```

Validated against the schema in `src/schema/soul.ts` before anything is
compiled — a malformed `SOUL.md` is rejected on schema grounds with the
specific field that's wrong, rather than failing inside a compiler.

## Directory layout

```
src/
├── cli.ts                  # entrypoint
├── commands/                # init, cast, skill add, sync
├── personas/                 # the bundled SOUL.md cast
├── schema/                   # SOUL.md + spell frontmatter validation
├── compilers/                 # one file per target tool
├── scanners/                  # repo stack detection
├── templates/                 # main-file templates + dashboard renderer
└── utils/
skills/
└── example-skill/             # starter skill, installed by `init`
```

## Known issues

- **OpenCode's agent directory name is unconfirmed.** Two
  documentation sources disagree on whether it's `.opencode/agent/`
  (singular) or `.opencode/agents/` (plural). Shipped with singular as the
  default in `src/compilers/opencode.ts` — confirm against the live docs
  and fix the `OPENCODE_AGENT_DIR` constant if it's wrong before relying on
  this in production.
- **Antigravity output is advisory, not invokable.** Antigravity doesn't
  currently support statically-defined, named subagents — see the table
  above. Revisit `src/compilers/antigravity.ts` if that changes.

## License

MIT
