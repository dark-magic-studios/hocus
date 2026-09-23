import fsExtra from "fs-extra";
const { ensureDir, copy, writeFile, pathExists, remove } = fsExtra;
import path from "node:path";
import type { CompiledFile } from "../compilers/types.js";
import { log } from "./log.js";
import { isSymlink, linkOrCopy } from "./link.js";

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
  /** Also mirror the skill into .github/skills/ for GitHub Copilot. */
  copilot?: boolean;
  /** Extra repo-relative mirror directories (e.g. ".claude/skills"). */
  mirrors?: string[];
  /**
   * Symlink mirrors to .agents/skills/<name> instead of copying. When unset,
   * a mirror that is already a symlink stays one.
   */
  symlink?: boolean;
}

/**
 * Skills conform to the Agent Skills open standard.
 * Installs to .agents/skills/ (the source of truth) and mirrors it into the
 * agent plugin's skills/ directory under .agents/plugins/<pluginName>/skills/,
 * .commandcode/skills/, .github/skills/ and any extra `mirrors`.
 * Returns the directories holding real files (the source plus copied
 * mirrors), so callers can patch them; symlinked mirrors follow the source.
 */
export async function installSkill(
  sourceDir: string,
  repoRoot: string,
  skillName: string,
  options: SkillInstallOptions = {},
): Promise<string[]> {
  const primary = path.join(repoRoot, ".agents", "skills", skillName);
  if (options.dryRun) {
    log.planned(path.relative(repoRoot, primary), skillName);
  } else if (path.resolve(sourceDir) !== path.resolve(primary)) {
    if (await isSymlink(primary)) await remove(primary);
    await ensureDir(path.dirname(primary));
    await copy(sourceDir, primary, { overwrite: true });
  }

  const mirrorDirs = [
    ...(options.pluginName ? [path.join(".agents", "plugins", options.pluginName, "skills")] : []),
    ...(options.commandCode ? [path.join(".commandcode", "skills")] : []),
    ...(options.copilot ? [path.join(".github", "skills")] : []),
    ...(options.mirrors ?? []),
  ];
  const copied = await mirrorSkill(repoRoot, skillName, mirrorDirs, options);
  return [primary, ...copied];
}

/**
 * Mirrors .agents/skills/<skillName> into each repo-relative directory.
 * Returns the mirrors written as copies.
 */
export async function mirrorSkill(
  repoRoot: string,
  skillName: string,
  mirrorDirs: string[],
  options: { symlink?: boolean; dryRun?: boolean } = {},
): Promise<string[]> {
  const primary = path.join(repoRoot, ".agents", "skills", skillName);
  const copied: string[] = [];
  for (const dir of new Set(mirrorDirs)) {
    const dest = path.join(repoRoot, dir, skillName);
    const symlink = options.symlink ?? (await isSymlink(dest));
    const result = await linkOrCopy(primary, dest, { symlink, dryRun: options.dryRun, repoRoot });
    if (result === "copied") copied.push(dest);
  }
  return copied;
}

export async function fileExists(p: string): Promise<boolean> {
  return pathExists(p);
}
