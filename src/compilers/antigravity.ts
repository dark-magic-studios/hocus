import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import matter from "gray-matter";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";

const DEFAULT_TOOLS = ["read", "grep", "glob"];

const ANTIGRAVITY_TOOL_MAP: Record<string, string[]> = {
  read: ["view_file", "list_dir"],
  grep: ["grep_search"],
  glob: ["find_by_name"],
  edit: ["replace_file_content", "multi_replace_file_content"],
  write: ["write_to_file"],
  bash: ["run_command", "manage_task"],
  shell: ["run_command", "manage_task"],
};

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
    const rawTools = soul.tools ?? DEFAULT_TOOLS;
    const tools = Array.from(
      new Set(
        rawTools.flatMap(
          (tool) => ANTIGRAVITY_TOOL_MAP[tool.toLowerCase()] ?? [tool],
        ),
      ),
    );

    const frontmatter: Record<string, unknown> = {
      name: soul.character,
      description: `${soul.display_name} — ${soul.role}. ${firstSentence(soul.body)} Use for: ${soul.triggers.join(", ")}.`,
      subagent: soul.subagent !== undefined ? Boolean(soul.subagent) : true,
      model: soul.model ?? "inherit",
      tools,
    };

    let body = soul.body.trim();
    if (!body.startsWith("#")) {
      body = `# Agent System Instructions\n\n${body}`;
    }
    const content = matter.stringify(`${body}\n`, frontmatter);

    return {
      relPath: path.join(".agents", "agents", soul.character, "agent.md"),
      content,
    };
  },
};

function firstSentence(body: string): string {
  const stripped = body.replace(/^#.*$/m, "").trim();
  const match = stripped.match(/[^.\n]+[.]/);
  return (match ? match[0] : stripped.slice(0, 120)).trim();
}
