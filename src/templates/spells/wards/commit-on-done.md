---
name: commit-on-done
type: ward
trigger: after-task-complete
calls: commit-message
description: Auto-commit when task finishes and changes are staged
---

When a task finishes and changes are staged, cast the `commit-message`
incantation and commit — without being asked.
