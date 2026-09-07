---
trigger: model_decision
description: Conventional commits standards, atomic single-concern change discipline, and repository cleanliness.
---

# Git Commit Hygiene & Conventional Commits

Maintain a clean, traceable git history with atomic commits and clear rationale.

## 1. Atomic Commits

- **One Logical Change per Commit**: Keep bug fixes, feature implementations, and formatting/refactoring separate.
- **Self-Contained Verification**: Every commit should leave the test suite passing (`pnpm test` and `pnpm typecheck`).

## 2. Conventional Commit Formatting

Format commit messages following the Conventional Commits specification:

```text
<type>(<optional-scope>): <concise description in imperative mood>

[optional body explaining WHY this change was made and any trade-offs]
```

- Allowed types:
  - `feat`: New user-facing feature or target compiler support
  - `fix`: Bug fix in compiler, CLI, or TUI logic
  - `refactor`: Code reorganization without functional changes
  - `test`: Adding or updating test fixtures and specs
  - `docs`: Documentation, README, or template changes
  - `chore`: Dependency updates, tooling, or build configuration

## 3. Clean Diffs

- Avoid committing transient files, editor caches, or scratch scripts.
- Ensure line endings and whitespace changes are isolated from semantic code edits.
