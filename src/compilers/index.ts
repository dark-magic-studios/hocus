import { claudeCodeCompiler } from "./claude-code.js";
import { openCodeCompiler } from "./opencode.js";
import { cursorCompiler } from "./cursor.js";
import { antigravityCompiler } from "./antigravity.js";
import type { Compiler, TargetId } from "./types.js";

export const ALL_COMPILERS: Compiler[] = [
  claudeCodeCompiler,
  openCodeCompiler,
  cursorCompiler,
  antigravityCompiler,
];

export function getCompiler(id: TargetId): Compiler {
  const compiler = ALL_COMPILERS.find((c) => c.id === id);
  if (!compiler) throw new Error(`Unknown compiler target: ${id}`);
  return compiler;
}

export type { Compiler, TargetId, CompiledFile, RepoContext, DetectedStack } from "./types.js";
