import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import matter from "gray-matter";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";

export const cursorCompiler: Compiler = {
  id: "cursor",
  label: "Cursor",

  async detect(repoRoot: string) {
    return pathExists(path.join(repoRoot, ".cursor"));
  },

  compile(soul: SoulFile, _ctx: RepoContext): CompiledFile {
    const frontmatter: Record<string, unknown> = {
      name: soul.character,
      description: `${soul.display_name} — ${soul.role}. ${firstSentence(soul.body)} Use for: ${soul.triggers.join(", ")}.`,
    };
    if (soul.model) frontmatter.model = soul.model;

    const body = soul.body.trim();
    const content = matter.stringify(`${body}\n`, frontmatter);

    return {
      relPath: path.join(".cursor", "agents", `${soul.character}.md`),
      content,
    };
  },
};

function firstSentence(body: string): string {
  const stripped = body.replace(/^#.*$/m, "").trim();
  const match = stripped.match(/[^.\n]+[.]/);
  return (match ? match[0] : stripped.slice(0, 120)).trim();
}
