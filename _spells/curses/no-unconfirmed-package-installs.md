---
name: no-unconfirmed-package-installs
type: curse
severity: soft
description: Soft stop before adding new runtime dependencies
---

Before adding an external third-party package (`npm install`, `pnpm add`, `pip install`),
verify if the problem can be solved cleanly with the standard library or existing
dependencies. If an external package is required, notify the user with the rationale.
