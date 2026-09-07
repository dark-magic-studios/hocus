import fsExtra from "fs-extra";
const { ensureDir, copy, writeFile, pathExists } = fsExtra;
import path from "node:path";
import type { CompiledFile } from "../compilers/types.js";
import { log } from "./log.js";

export interface FileWriteOptions {
  dryRun?: boolean;
  /** Target tool label shown in dry-run output (e.g. "Claude Code"). */
  target?: string;
}

export async function writeCompiledFile(
  repoRoot: string,
  file: CompiledFile,
  options: FileWriteOptions = {},
): Promise<string> {
  const fullPath = path.join(repoRoot, file.relPath);
  if (options.dryRun) {
    log.planned(file.relPath, options.target);
    return fullPath;
  }
  await ensureDir(path.dirname(fullPath));
  await writeFile(fullPath, file.content, "utf8");
  return fullPath;
}

export interface SkillInstallOptions extends FileWriteOptions {
  pluginName?: string;
  /** Also mirror the skill into .commandcode/skills/ for Command Code. */
  commandCode?: boolean;
}

/**
 * Skills conform to the Agent Skills open standard.
 * Installs to .agents/skills/ and optionally into the agent plugin's
 * skills/ directory under .agents/plugins/<pluginName>/skills/.
 * When `commandCode` is set, also mirrors to .commandcode/skills/.
 * No Claude-specific directories (.claude/skills/) are created.
 */
export async function installSkill(
  sourceDir: string,
  repoRoot: string,
  skillName: string,
  options: SkillInstallOptions = {},
): Promise<string[]> {
  const targets = [
    path.join(repoRoot, ".agents", "skills", skillName),
  ];
  if (options.pluginName) {
    targets.push(
      path.join(repoRoot, ".agents", "plugins", options.pluginName, "skills", skillName)
    );
  }
  if (options.commandCode) {
    targets.push(path.join(repoRoot, ".commandcode", "skills", skillName));
  }

  for (const target of targets) {
    if (options.dryRun) {
      log.planned(path.relative(repoRoot, target), skillName);
      continue;
    }
    await ensureDir(path.dirname(target));
    await copy(sourceDir, target, { overwrite: true });
  }

  return targets;
}

export async function fileExists(p: string): Promise<boolean> {
  return pathExists(p);
}
