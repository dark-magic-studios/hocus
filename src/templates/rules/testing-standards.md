---
trigger: model_decision
globs: ["tests/**/*", "src/**/*"]
description: Testing standards, isolated filesystem fixtures, child process mocking, and Ink TUI testing practices.
---

# Testing & Verification Protocol

The test suite runs via Node.js native test runner: `node --test --import tsx tests/*.test.ts tests/*.test.tsx` (or `pnpm test`).

## 1. Filesystem Isolation

Never operate directly on the real project or user directories during tests:
- **Temporary Repos**: Use `makeEmptyRepo()` or `makePopulatedRepo()` from `tests/tui-fixtures.ts` to create temporary directories in `os.tmpdir()`.
- **Guaranteed Cleanup**: Always wrap test operations in `try ... finally` and invoke `cleanupRepo(dir)` or `rm(dir, { recursive: true, force: true })`.
- **Global Config Isolation**: When testing global flags (e.g. `runAdd({ global: true })`), provide `overrideHomeDir: fakeHome` so the user's `~/.gemini`, `~/.claude`, or `~/.cursor` directories are never touched.

## 2. Child Process & Agent Execution Mocking

- Commands that spawn external CLIs (such as `agy`, `claude`, `codex`, `opencode`, `agent`, `rtk`, or `graphify`) must accept an injectable `spawnFn` argument (defaulting to `node:child_process.spawnSync`).
- In unit tests, inject a mock `spawnFn` that records command lines and returns simulated results without launching child processes.

## 3. Ink TUI Testing

- Test interactive TUI components with `ink-testing-library`.
- Ensure tests verify key press handling, tab switches, and terminal rendering without hanging or leaving dangling listeners.
