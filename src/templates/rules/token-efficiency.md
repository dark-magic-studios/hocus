---
trigger: always_on
description: Guidelines for token optimization, RTK shell command proxying, and Graphify knowledge graph queries.
---

# Token Efficiency, RTK & Graphify Guidelines

Context windows are finite resources. Use optimized tools to reduce token spend and maintain concise agent context.

## 1. RTK (Rust Token Killer) Command Proxying

Whenever executing terminal commands that may generate verbose outputs, prefix with `rtk` if installed:

```bash
rtk git status
rtk cargo test
rtk pnpm test
rtk ls src/
rtk grep "pattern" src/
```

- RTK strips boilerplate formatting, excessive whitespace, and repetitive stack traces, saving 60-90% of tokens before command output enters the context window.
- Meta commands available: `rtk gain` (check savings), `rtk discover` (find missed opportunities).

## 2. Graphify Knowledge Graph (`graphify-out/`)

This project supports Graphify knowledge graph indexing:
- When `graphify-out/graph.json` exists, query the graph with `graphify query "<question>"` or `graphify path "<nodeA>" "<nodeB>"` rather than running sweeping, broad ripgrep searches across the whole workspace.
- Check `graphify-out/wiki/index.md` for fast conceptual navigation.
- After substantial code refactors, run `graphify update .` to keep graph indices synchronized.

## 3. Progressive Disclosure for Skills

- Keep all `SKILL.md` documents lean (under 500 lines).
- Offload specialized checklists, large schema payloads, or detailed reference tables into `references/` or `rules/` subdirectories so they are only loaded when explicitly referenced.
