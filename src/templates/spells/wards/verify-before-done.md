---
name: verify-before-done
type: ward
trigger: before-task-complete
calls: test-plan
description: Runs and outputs test plan before completing tasks
---

Before marking any task complete in `TASKS.md` or setting a potion status
to `sealed`, cast `test-plan` and execute the steps.
