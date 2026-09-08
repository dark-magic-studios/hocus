---
trigger: model_decision
globs: ["_potions/**/*", "TASKS.md", "PRODUCT.md", "MEMORY.md"]
description: Workflow and schema for feature battle plans (_potions/*.md), task tracking in TASKS.md, and project memory persistence.
---

# Feature Potions & Task Orchestration

Hocus uses a potion-based battle plan pattern to manage features and orchestrate agent handoffs.

## 1. Potion File Structure (`_potions/<potion-id>.md`)

Every non-trivial feature or refactor must be backed by a potion file:

```markdown
---
potion: DMS-42
feature: Add Antigravity Subagent Support
status: casting
progress: 75
drafted_by: richard
assigned_to: gilfoyle
---

# Battle Plan Summary
...
```

- `potion`: Ticket or unique identifier.
- `status`: Lifecycle phase:
  - `draft`: Plan being designed by the planner (Richard / Merlin).
  - `casting`: Active implementation in progress by orchestrator (Jared / Roger Bacon) and builders.
  - `sealed`: Complete, reviewed, tested, and verified.
- `progress`: Integer percentage `0` to `100`.

## 2. Project State Alignment

- `TASKS.md`: Reflects active tasks, prioritized backlog, and completed deliverables.
- `PRODUCT.md`: Records user-facing product milestones and shipped capabilities.
- `MEMORY.md`: Preserves critical architecture decisions, rationale, and project chronology so future agent sessions do not regress existing designs.
