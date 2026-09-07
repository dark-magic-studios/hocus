import type { SoulFile } from "../schema/soul.js";

export interface DetectedStack {
  languages: string[];
  frameworks: string[];
  packageManager?: string;
}

export interface RepoContext {
  repoRoot: string;
  stack: DetectedStack;
}

export interface CompiledFile {
  /** Path relative to repoRoot the compiler wants to write. */
  relPath: string;
  content: string;
}

export type TargetId = "claude-code" | "opencode" | "cursor" | "antigravity" | "command-code";

export interface Compiler {
  id: TargetId;
  label: string;
  /**
   * Cheap, local heuristic for whether this target is in use in a repo —
   * e.g. a `.claude/` directory already existing. Used by `cast` to decide
   * which compilers to run when the user hasn't said explicitly.
   */
  detect(repoRoot: string): Promise<boolean>;
  /** Translate one persona into this target's native file. */
  compile(soul: SoulFile, ctx: RepoContext): CompiledFile;
}
