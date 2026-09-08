---
name: no-blind-catch-suppression
type: curse
severity: hard
description: Forbids empty catch blocks and unexplained error swallowing
---

Never write empty catch blocks (`catch (e) {}`), blind `.catch(() => {})`, or
uncommented `@ts-ignore` directives. Every caught error must either be logged,
rethrown, or accompanied by a comment explaining why discarding it is safe.
