import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";

/**
 * Codex project subagents are standalone TOML configuration layers. Skills
 * remain in `.agents/skills/`, which Codex discovers from the working
 * directory up to the repository root.
 */
export const codexCompiler: Compiler = {
  id: "codex",
  label: "Codex",

  async detect(repoRoot: string) {
    return pathExists(path.join(repoRoot, ".codex"));
  },

  compile(soul: SoulFile, _ctx: RepoContext): CompiledFile {
    const description = `${soul.display_name} — ${soul.role}. Use for: ${soul.triggers.join(", ")}.`;
    const model = soul.model ? `model = ${tomlString(soul.model)}\n` : "";
    const content =
      `name = ${tomlString(soul.character)}\n` +
      `description = ${tomlString(description)}\n` +
      model +
      `developer_instructions = \"\"\"\n${escapeMultilineString(soul.body)}\n\"\"\"\n`;

    return {
      relPath: path.join(".codex", "agents", `${soul.character}.toml`),
      content,
    };
  },
};

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function escapeMultilineString(value: string): string {
  return value.replace(/\"\"\"/g, '\\\"\\\"\\\"');
}
