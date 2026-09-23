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
      `developer_instructions = \"\"\"\n${escapeMultilineString(soul.body)}\\\n\"\"\"\n`;

    return {
      relPath: path.join(".codex", "agents", `${soul.character}.toml`),
      content,
    };
  },
};

function tomlString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Escapes a value for a TOML basic multiline string (`"""..."""`). Backslashes
 * go first so later escapes aren't doubled; control characters other than tab
 * and newline become `\uXXXX`; any run of three or more quotes is fully
 * escaped so it cannot close the string early. The caller closes the string
 * with a line-ending backslash, so the delimiter sits on its own line (a body
 * ending in `"` stays valid) without adding a trailing newline to the value.
 */
function escapeMultilineString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .replace(/"{3,}/g, (run) => '\\"'.repeat(run.length));
}
