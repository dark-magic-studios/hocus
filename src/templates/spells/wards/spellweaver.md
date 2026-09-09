---
name: spellweaver
type: ward
trigger: on-spell-authoring
calls: devlog-bullet
description: Automatically categorizes any authored convention as a ward, incantation, or curse
---

When authoring, importing, or editing a spell convention:

1. **Automatic Classification**:
   - **Incantation** (template): Output formats, placeholders (`{emoji}`, `{scope}`), schemas, and wording templates. The "what to say".
   - **Ward** (hook): Lifecycle events (`trigger`), automated reactions (`after-task-complete`, `on-pr-open`), calling an incantation. The "when to act".
   - **Curse** (guardrail): Negative constraints, anti-patterns, forbidden actions (`never`, `must not`, `do not`) with `hard` or `soft` severity. The "what never to do".

2. **Placement & Routing**:
   - Automatically route to `.hocus/_spells/incantations/`, `.hocus/_spells/wards/`, or `.hocus/_spells/curses/`.
   - Ensure required frontmatter matches the categorized type (`trigger`/`calls` for wards, `severity` for curses).
