---
name: spellweaver
description: Read, audit, and tailor repository spells (_spells/) to match your team's style, tone, and workflow conventions.
---

# Spellweaver

The Spellweaver is an expert convention architect and spell-crafter. It reads, audits, personalizes, and harmonizes the repository's `_spells/` directory — tuning **incantations** (output templates), **wards** (lifecycle hooks), and **curses** (negative guardrails) to reflect the engineering team's culture.

## When to use
- Tailoring a newly initialized repository's conventions after `hocus init`
- Auditing existing spells for redundancy, stale rules, or friction
- Adjusting formatting flavor (e.g. adding or removing emojis, tuning verbosity)
- Aligning commit, PR, changelog, or ticket conventions with team standards
- Adding custom wards or curses for project-specific risks

## Instructions

### 1. Inventory Existing Spells
Scan `_spells/` (or inspect `_spells/manifest.json` if available):
- **Incantations** (`_spells/incantations/`): Read output templates (commit messages, PR descriptions, dev logs, etc.).
- **Wards** (`_spells/wards/`): Catalog triggers and which incantations they call.
- **Curses** (`_spells/curses/`): Catalog negative constraints and their severities (`hard` vs `soft`).

If `_spells/` does not yet exist in the repository, note that you will be creating the initial spell set from Hocus starter templates.

### 2. Style & Workflow Interview (Default 3–5 Questions)
Before making edits, ask the user 3 to 5 targeted questions to establish preferences:

1. **Emoji & Visual Formatting**:
   - *Question*: "Do you prefer emojis in commits, PR headers, and devlogs (e.g. `✨(auth): add google login`), or strict plain-text / semantic commits (e.g. `feat(auth): add google login`)?"
2. **Tone & Formality**:
   - *Question*: "What tone should agent-generated descriptions and summaries take? (e.g., Serious & terse, standard professional engineering, or lighthearted / playful)?"
3. **Guardrail Severity & Strictness**:
   - *Question*: "How strict should curses be? Should actions like package installs or schema alterations be hard stops (always block and demand confirmation) or soft warnings (flag rationale and proceed if clear)?"
4. **Tooling & Ticket System**:
   - *Question*: "What issue tracker / project workflow do you use (Linear, GitHub Issues, Jira, TASKS.md), and does your team enforce a specific branch or ticket identifier prefix?"
5. **Redundancy & Pruning**:
   - *Question*: "Are there any spells in the current list that are already handled by your linter, CI pipeline, or pre-commit hooks that we should remove to eliminate friction?"

### 3. Audit & Formulate Tailored Spells
Synthesize the user's responses against the current spell library:
- **Restyle Incantations**: Add or remove emojis, adjust heading styles, modify casing, or customize placeholders (`{scope}`, `{ticket_id}`).
- **Tune Wards**: Ensure triggers match the team's lifecycle points (`after-task-complete`, `on-pr-open`, `pre-commit`, `on-test-fail`). Remove wards the team finds intrusive.
- **Calibrate Curses**: Adjust severity (`hard` vs `soft`). Prune curses redundant with automated linters/CI (e.g., if ESLint already forbids `@ts-ignore`). Add project-specific curses if needed (e.g., protecting a legacy billing module).

### 4. Present Proposed Diffs
Present the planned changes clearly to the user before writing to disk:
- **Updated spells** (showing before/after or template diffs)
- **Pruned spells** (explaining why they were removed)
- **New spells woven** (showing name, type, and content)

### 5. Apply Changes & Resync Manifest
1. Write the updated markdown files to `_spells/incantations/`, `_spells/wards/`, and `_spells/curses/`.
2. Ensure every file has valid YAML frontmatter:
   - Incantations: `name`, `type: incantation`, optional `description`
   - Wards: `name`, `type: ward`, `trigger`, `calls`, optional `description`
   - Curses: `name`, `type: curse`, `severity: hard | soft`, optional `description`
3. Regenerate `_spells/manifest.json` and refresh `dashboard.html` by running `hocus sync` (or updating the manifest directly).
4. Summarize the tailored spellbook for the user.
