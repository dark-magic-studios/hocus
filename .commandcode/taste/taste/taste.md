# Taste
- Verify before done: run typecheck, the full test suite, and dry-run/manual checks (scratch repo, `--dry-run` flags) before calling feature work complete. Confidence: 0.7
- Land work as atomic conventional commits — one logical change per commit (hocus bundles an atomic-commits skill for this). Confidence: 0.6
- hocus uses pnpm: `pnpm typecheck`, `pnpm test`; tests use node:test with node:assert/strict, executed via tsx. Confidence: 0.8
- Interactive-first CLI UX: ask users a y/N question in a TTY, auto-detect/sensible fallback in non-TTY or CI, and always offer explicit `--flag` / `--no-flag` overrides to force the behavior. Confidence: 0.8
- New identifiers should follow a codebase's existing naming conventions (e.g. kebab-case target ids consistent with `claude-code`, `opencode`) rather than shorter informal aliases. Confidence: 0.7
- Ground integration formats and generated instructions in official documentation — fetch/verify against the real docs (e.g. commandcode.ai/docs) instead of guessing. Confidence: 0.8
- Tooling he builds must keep generated agents taste-compatible: agents read `.commandcode/taste/` (and global `~/.commandcode/taste/`), treat taste learnings as requirements, and never hand-edit taste files. Confidence: 0.7
