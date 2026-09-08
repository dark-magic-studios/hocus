---
trigger: always_on
globs: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"]
description: TypeScript guidelines, strict ESM import paths with .js extensions, and build verification for Hocus.
---

# TypeScript & ESM Module Standards

Hocus is an ESM-native Node.js project targeting Node.js >= 18. Strict module resolution and type safety are required.

## 1. Explicit `.js` Extensions on Relative Imports

Because this project uses `"type": "module"`, all relative TypeScript imports must specify the `.js` extension corresponding to the compiled output:

```typescript
// Correct:
import { antigravityCompiler } from "./antigravity.js";
import { SoulFile } from "../schema/soul.js";

// Forbidden (fails in Node ESM runtime):
import { antigravityCompiler } from "./antigravity";
import { antigravityCompiler } from "./antigravity.ts";
```

## 2. Strict Type Safety

- **No Implicit `any`**: Ensure strict typing on all function signatures, compiler outputs, and props.
- **Zod for Runtime Parsing**: Validate untrusted file inputs (`SOUL.md`, `_potions/*.md`, configs) through schemas (`src/schema/`).
- **Clean Typecheck**: Always run `pnpm typecheck` (`tsc --noEmit`) before completing any code changes. Never leave compiler errors.

## 3. Build & Packaging

- **Bundler**: `tsup` bundles `src/cli.ts` into `dist/cli.js` (`pnpm build`).
- **Files Field in package.json**: Only `dist`, `src/personas`, `src/templates`, and `skills` are distributed.
- Do not commit generated `dist/` artifacts in intermediate feature branches unless specifically preparing a release.
