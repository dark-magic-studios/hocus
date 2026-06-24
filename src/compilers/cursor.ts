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
    // Cursor doesn't have a named-subagent abstraction. The closest
    // equivalent is an "Agent Requested" rule: alwaysApply is false, and
    // Cursor's agent decides to load it based on the description matching
    // the current task. We say so explicitly in the body so nobody mistakes
    // this for an invokable subagent the way the Claude Code / OpenCode
    // output is.
    const frontmatter = {
      description: `${soul.display_name} (${soul.role}). Apply when working on: ${soul.triggers.join(", ")}.`,
      alwaysApply: false,
    };

    const body = [
      `> This rule represents the **${soul.display_name}** persona (${soul.role}).`,
      `> Cursor has no native subagent you can delegate to directly — when this`,
      `> rule is active, adopt the voice and responsibilities below for the`,
      `> current task.`,
      "",
      soul.body,
    ].join("\n");

    const content = matter.stringify(body, frontmatter);

    return {
      relPath: path.join(".cursor", "rules", `${soul.character}.mdc`),
      content,
    };
  },
};
