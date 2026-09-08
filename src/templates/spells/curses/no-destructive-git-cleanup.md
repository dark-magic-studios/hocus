---
name: no-destructive-git-cleanup
type: curse
severity: hard
description: Forbids destructive clean commands that permanently lose uncommitted work
---

Never execute `git clean -f`, `git clean -fd`, `git reset --hard`, or `rm -rf`
on repository directories without explicit confirmation from the user.
