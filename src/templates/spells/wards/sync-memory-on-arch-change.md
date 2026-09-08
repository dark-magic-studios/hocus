---
name: sync-memory-on-arch-change
type: ward
trigger: after-architecture-decision
calls: devlog-bullet
description: Persists major architectural decisions into MEMORY.md
---

Whenever a core architectural change, schema alteration, or harness migration
lands, append a `devlog-bullet` entry to `MEMORY.md`.
