import path from "node:path";
import { lstat, symlink } from "node:fs/promises";
import fsExtra from "fs-extra";
const { ensureDir, copy, remove, pathExists } = fsExtra;
import { log } from "./log.js";

export interface LinkOptions {
  /** Create a relative symlink instead of a copy. */
  symlink: boolean;
  dryRun?: boolean;
  /** Used to print repo-relative paths in dry-run output. */
  repoRoot?: string;
}

let warnedFallback = false;

export async function isSymlink(p: string): Promise<boolean> {
  try {
    return (await lstat(p)).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Makes `dest` mirror `src`: a relative symlink when `symlink` is set, a copy
 * otherwise. Whatever sits at `dest` is replaced — callers only pass paths
 * hocus manages. When the OS refuses symlinks (e.g. Windows without Developer
 * Mode) it falls back to copying and warns once.
 */
export async function linkOrCopy(src: string, dest: string, options: LinkOptions): Promise<"linked" | "copied"> {
  const mode = options.symlink ? "linked" : "copied";
  if (options.dryRun) {
    const shown = options.repoRoot ? path.relative(options.repoRoot, dest) : dest;
    log.planned(shown, options.symlink ? `symlink -> ${path.relative(path.dirname(dest), src)}` : "copy");
    return mode;
  }

  if (path.resolve(src) === path.resolve(dest)) return mode;
  await ensureDir(path.dirname(dest));
  if ((await isSymlink(dest)) || (await pathExists(dest))) {
    await remove(dest);
  }

  if (options.symlink) {
    const target = path.relative(path.dirname(dest), src);
    const isDir = (await lstat(src)).isDirectory();
    try {
      await symlink(target, dest, isDir ? "dir" : "file");
      return "linked";
    } catch (err) {
      if (!warnedFallback) {
        warnedFallback = true;
        log.warn(`couldn't create symlinks (${(err as NodeJS.ErrnoException).code ?? "error"}) — copying instead`);
      }
    }
  }

  await copy(src, dest, { overwrite: true, dereference: true });
  return "copied";
}
