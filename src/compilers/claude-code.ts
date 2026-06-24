import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import matter from "gray-matter";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";

const DEFAULT_TOOLS = ["Read", "Grep", "Glob"];

export const claudeCodeCompiler: Compiler = {
  id: "claude-code",
  label: "Claude Code",

  async detect(repoRoot: string) {
    return pathExists(path.join(repoRoot, ".claude"));
  },

  compile(soul: SoulFile, _ctx: RepoContext): CompiledFile {
    const tools = (soul.tools ?? DEFAULT_TOOLS).map(capitalize);

    const frontmatter: Record<string, unknown> = {
      name: soul.character,
      description: `${soul.display_name} — ${soul.role}. ${firstSentence(soul.body)} Use for: ${soul.triggers.join(", ")}.`,
      tools: tools.join(", "),
    };
    if (soul.model) frontmatter.model = soul.model;

    const content = matter.stringify(soul.body, frontmatter);

    return {
      relPath: path.join(".claude", "agents", `${soul.character}.md`),
      content,
    };
  },
};

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function firstSentence(body: string): string {
  const stripped = body.replace(/^#.*$/m, "").trim();
  const match = stripped.match(/[^.\n]+[.]/);
  return (match ? match[0] : stripped.slice(0, 120)).trim();
}
