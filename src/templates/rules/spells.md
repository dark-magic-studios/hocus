---
trigger: model_decision
globs: [".hocus/_spells/**/*"]
description: Atomic conventions, templates (incantations), lifecycle triggers (wards), and stop conditions (curses).
---

# Spells Convention

Spells are Hocus-native, atomic, single-purpose conventions — distinct from potions (`.hocus/_potions/`, multi-step task recipes) and skills (mirrored `SKILL.md` external standard). A spell is never a whole workflow; it's a rule an agent follows while doing one.

Three spell types, one folder:

```
.hocus/_spells/
  incantations/   → templates (the "what to say")
  wards/          → hooks (the "when to act")
  curses/         → guardrails (the "what never to do")
```

## 1. Incantations — templates

A fixed output format an agent must reproduce exactly, not paraphrase or "improve."
Examples: commit message, PR description, changelog entry.

## 2. Wards — hooks

An incantation triggered automatically by a lifecycle event, no manual invocation needed.
Trigger vocabulary: `after-task-complete`, `pre-commit`, `on-pr-open`, `on-test-fail`, etc.
When a ward's trigger condition is met, cast its linked incantation without being asked.

## 3. Curses — guardrails

A hard constraint. Not a preference — a stop condition.
Severity:
- `hard`: always stop and ask the user for explicit confirmation before proceeding.
- `soft`: flag the concern to the user but proceed if unblocked.

Never violate a curse.
