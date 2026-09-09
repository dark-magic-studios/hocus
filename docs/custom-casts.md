# Custom casts

Hocus ships two built-in naming **casts**:

| Cast | Example personas | Example skills |
|------|------------------|----------------|
| `valley` | Richard, Gilfoyle, Jared | `/richard-draft-potion`, `/gilfoyle-pr-review` |
| `wizard` | Merlin, Zoroaster, Roger Bacon | `/merlin-draft-potion`, `/zoroaster-pr-review` |

The active cast is stored in `.hocus/config.json`:

```json
{ "cast": "wizard" }
```

A cast controls three things together:

1. **Persona slugs** — `character` in `.hocus/personas/*.soul.md` and the filename stem
2. **Display names** — `display_name` in soul frontmatter
3. **Skill ids** — folder names under `.agents/skills/` and `name` in `SKILL.md` for persona-bound skills

Generic skills (`graphify`, `atomic-commits`, etc.) are not renamed.

## Switching casts

### CLI

```bash
# List built-in and custom casts
hocus recast --list

# Switch to Silicon Valley naming
hocus recast valley

# Switch to wizard naming
hocus recast wizard

# Preview without writing files
hocus recast valley --dry-run
```

After switching, recompile harness outputs:

```bash
hocus cast
hocus sync
```

### TUI (Souls tab)

1. Open the command deck: `hocus tui`
2. Go to **souls** (tab `3`)
3. Press **`c`** to open the cast picker
4. **↑↓** to highlight a cast, **⏎** to recast
5. **`n`** to create a new custom cast, **`d`** to delete a custom cast

The souls list shows **display name** and **slug** (not raw file paths).

## Custom casts

Custom casts live at:

```
.hocus/casts/<cast-id>.json
```

Create a template:

```bash
hocus recast cyberpunk --create --label "Cyberpunk crew"
```

Example `.hocus/casts/cyberpunk.json`:

```json
{
  "label": "Cyberpunk crew",
  "personas": {
    "richard": { "character": "neo", "display_name": "Neo" },
    "gilfoyle": { "character": "trinity", "display_name": "Trinity" },
    "jared": { "character": "morpheus", "display_name": "Morpheus" },
    "dinesh": { "character": "oracle", "display_name": "Oracle" }
  }
}
```

### Schema

| Field | Required | Description |
|-------|----------|-------------|
| `label` | yes | Shown in the TUI and `hocus recast --list` |
| `personas` | yes | Map of **canonical valley slug** → naming for that role |

Each persona entry:

| Field | Required | Description |
|-------|----------|-------------|
| `character` | yes | Slug used for soul filename, compiled agent id, and skill prefix |
| `display_name` | yes | Human-readable name in soul frontmatter and skill descriptions |

Canonical valley slugs (keys for `personas`):

`big-head`, `dinesh`, `erlich`, `gavin`, `gilfoyle`, `jared`, `jian-yang`, `laurie`, `monica`, `peter-gregory`, `project-manager`, `richard`, `russ`

Omitted roles keep valley defaults when you recast.

### Apply a custom cast

Edit the JSON, then:

```bash
hocus recast cyberpunk
```

This renames `.hocus/personas/*.soul.md`, updates frontmatter, renames persona-bound skills, and writes `"cast": "cyberpunk"` to `.hocus/config.json`.

### Delete a custom cast

```bash
hocus recast cyberpunk --delete
```

If the deleted cast was active, the project falls back to `wizard`.

## Aliases

Soul files always retain both canonical names in frontmatter:

```yaml
aliases:
  valley: Richard
  occult: Merlin
```

The dashboard can toggle display with `?cast=valley` or `?cast=occult` without changing files.

## Related commands

| Command | Purpose |
|---------|---------|
| `hocus init --cast valley` | First-time install with a chosen cast |
| `hocus recast <cast>` | Switch cast on an existing project |
| `hocus cast` | Compile personas to Claude/Codex/Cursor/etc. |
| `hocus absorb` | Remove one persona and migrate its agents (not cast switching) |
