---
name: changelog-on-release
type: ward
trigger: pre-tag-release
calls: changelog-entry
description: Generates changelog diff before tagging a new release
---

When preparing a version bump or release tag, inspect commits since the last
tag, format them using `changelog-entry`, and prepend to `CHANGELOG.md`.
