import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";

export const antigravityCompiler: Compiler = {
  id: "antigravity",
  label: "Antigravity",

  async detect(repoRoot: string) {
    return (
      (await pathExists(path.join(repoRoot, ".agents"))) ||
      (await pathExists(path.join(repoRoot, ".gemini")))
    );
  },

  compile(soul: SoulFile, _ctx: RepoContext): CompiledFile {
    // Antigravity's orchestrator spawns subagents dynamically at runtime —
    // there's no static, named-subagent file format to target the way
    // Claude Code or OpenCode have. This file is plain markdown context
    // under .agents/rules/, advisory rather than invokable: it gives the
    // orchestrator the persona to reference when it decides how to
    // decompose work, but doesn't make the persona directly callable.
    const header = [
      `<!--`,
      `  Advisory persona context for Antigravity's orchestrator.`,
      `  Antigravity does not support statically-defined, named subagents`,
      `  as of this writing — its subagents are spawned dynamically at`,
      `  runtime. This file is read as context, not invoked directly.`,
      `-->`,
      "",
      `# ${soul.display_name} — ${soul.role}`,
      "",
      `Voice: ${soul.voice}`,
      `Relevant for: ${soul.triggers.join(", ")}`,
      "",
    ].join("\n");

    return {
      relPath: path.join(".agents", "rules", `${soul.character}.md`),
      content: header + soul.body + "\n",
    };
  },
};
