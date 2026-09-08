---
name: no-force-push-main
type: curse
severity: hard
description: Hard stop against force pushing protected branches
---

Never execute `git push --force` or `git push -f` against `main`, `master`,
or any release branches.
