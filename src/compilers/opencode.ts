import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import path from "node:path";
import matter from "gray-matter";
import type { SoulFile } from "../schema/soul.js";
import type { Compiler, CompiledFile, RepoContext } from "./types.js";

/**
 * OpenCode's docs are inconsistent across sources about whether the project
 * agent directory is singular (`agent`) or plural (`agents`). Shipping with
 * the singular form as the default. If agents aren't being picked up,
 * flip this and re-run `hocus cast`.
 */
export const OPENCODE_AGENT_DIR = "agent";

export const openCodeCompiler: Compiler = {
  id: "opencode",
  label: "OpenCode",

  async detect(repoRoot: string) {
    return (
      (await pathExists(path.join(repoRoot, ".opencode"))) ||
      (await pathExists(path.join(repoRoot, "opencode.json")))
    );
  },

  compile(soul: SoulFile, _ctx: RepoContext): CompiledFile {
    const frontmatter: Record<string, unknown> = {
      description: `${soul.display_name} — ${soul.role}. Use for: ${soul.triggers.join(", ")}.`,
      mode: "subagent",
    };
    if (soul.model) frontmatter.model = soul.model;

    const content = matter.stringify(soul.body, frontmatter);

    return {
      relPath: path.join(".opencode", OPENCODE_AGENT_DIR, `${soul.character}.md`),
      content,
    };
  },
};
