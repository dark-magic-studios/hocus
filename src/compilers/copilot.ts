import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import matter from "gray-matter";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";

const DEFAULT_TOOLS = ["read", "grep", "glob"];

const COPILOT_TOOL_MAP: Record<string, string> = {
  read: "read",
  view: "read",
  grep: "search",
  glob: "search",
  find: "search",
  search: "search",
  edit: "edit",
  write: "edit",
  bash: "execute",
  shell: "execute",
  execute: "execute",
  agent: "agent",
  web: "web",
};

export const copilotCompiler: Compiler = {
  id: "copilot",
  label: "GitHub Copilot",

  async detect(repoRoot: string) {
    return (
      (await pathExists(path.join(repoRoot, ".github", "agents"))) ||
      (await pathExists(path.join(repoRoot, ".github", "skills"))) ||
      (await pathExists(path.join(repoRoot, ".copilot"))) ||
      (await pathExists(path.join(repoRoot, ".github", "copilot-instructions.md")))
    );
  },

  compile(soul: SoulFile, _ctx: RepoContext): CompiledFile {
    const rawTools = soul.tools ?? DEFAULT_TOOLS;
    const tools = Array.from(
      new Set(
        rawTools.map((t) => COPILOT_TOOL_MAP[t.toLowerCase()] ?? t.toLowerCase()),
      ),
    );

    const frontmatter: Record<string, unknown> = {
      name: soul.character,
      description: `${soul.display_name} — ${soul.role}. ${firstSentence(soul.body)} Use for: ${soul.triggers.join(", ")}.`,
      tools,
    };
    if (soul.model) frontmatter.model = soul.model;

    const content = matter.stringify(`${soul.body}\n`, frontmatter);

    return {
      relPath: path.join(".github", "agents", `${soul.character}.agent.md`),
      content,
    };
  },
};

function firstSentence(body: string): string {
  const stripped = body.replace(/^#.*$/m, "").trim();
  const match = stripped.match(/[^.\n]+[.]/);
  return (match ? match[0] : stripped.slice(0, 120)).trim();
}
