---
name: pr-on-open
type: ward
trigger: on-pr-open
calls: pr-description
description: Automatically formats PR description when opening a pull request
---

When generating or drafting a pull request, cast the `pr-description`
incantation and populate all sections with concrete diff details — do not leave placeholders.
