import fsExtra from "fs-extra";
const { ensureDir, copy, writeFile, pathExists } = fsExtra;
import path from "node:path";
import type { CompiledFile } from "../compilers/types.js";

export async function writeCompiledFile(repoRoot: string, file: CompiledFile): Promise<string> {
  const fullPath = path.join(repoRoot, file.relPath);
  await ensureDir(path.dirname(fullPath));
  await writeFile(fullPath, file.content, "utf8");
  return fullPath;
}

/**
 * Skills don't need per-tool compilation — the SKILL.md format is already
 * a shared open standard. Mirror the same folder into both locations so
 * Cursor, OpenCode, and Antigravity (which read .agents/skills/) and
 * Claude Code (which reads .claude/skills/) all pick it up without any
 * translation step.
 */
export async function installSkill(sourceDir: string, repoRoot: string, skillName: string): Promise<string[]> {
  const targets = [
    path.join(repoRoot, ".agents", "skills", skillName),
    path.join(repoRoot, ".claude", "skills", skillName),
  ];

  for (const target of targets) {
    await ensureDir(path.dirname(target));
    await copy(sourceDir, target, { overwrite: true });
  }

  return targets;
}

export async function fileExists(p: string): Promise<boolean> {
  return pathExists(p);
}
