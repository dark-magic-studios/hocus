---
name: diagnose-on-test-fail
type: ward
trigger: on-test-fail
calls: failure-diagnosis
description: Triages failing tests before making edits
---

When a test run fails, immediately cast `failure-diagnosis` to isolate the root
cause before modifying any application logic.
