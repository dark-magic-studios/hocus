import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import matter from "gray-matter";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";
import { COMMAND_CODE_TASTE_SECTION } from "../templates/taste.js";

const DEFAULT_TOOLS = ["read", "grep", "glob"];

// Command Code tool ids are lowercase snake_case (read_file, grep, glob, ...).
const TOOL_ID_MAP: Record<string, string> = {
  read: "read_file",
  grep: "grep",
  glob: "glob",
  edit: "edit_file",
  write: "write_file",
  bash: "shell_command",
  shell: "shell_command",
};

export const commandCodeCompiler: Compiler = {
  id: "command-code",
  label: "Command Code",

  async detect(repoRoot: string) {
    return pathExists(path.join(repoRoot, ".commandcode"));
  },

  compile(soul: SoulFile, _ctx: RepoContext): CompiledFile {
    const tools = (soul.tools ?? DEFAULT_TOOLS).map(
      (tool) => TOOL_ID_MAP[tool.toLowerCase()] ?? tool,
    );

    const frontmatter: Record<string, unknown> = {
      name: soul.character,
      description: `${soul.display_name} — ${soul.role}. ${firstSentence(soul.body)} Use for: ${soul.triggers.join(", ")}.`,
      tools: tools.join(", "),
    };
    if (soul.model) frontmatter.model = soul.model;

    const body = `${soul.body}\n\n${COMMAND_CODE_TASTE_SECTION}\n`;
    const content = matter.stringify(body, frontmatter);

    return {
      relPath: path.join(".commandcode", "agents", `${soul.character}.md`),
      content,
    };
  },
};

function firstSentence(body: string): string {
  const stripped = body.replace(/^#.*$/m, "").trim();
  const match = stripped.match(/[^.\n]+[.]/);
  return (match ? match[0] : stripped.slice(0, 120)).trim();
}
