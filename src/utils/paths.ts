import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Walks up from `startDir` until it finds a directory containing
 * package.json. Deliberately not relative-path math: tsup bundles this
 * whole module graph into a single dist/cli.js, which collapses the
 * directory depth this file actually lives at relative to the package
 * root. Running from source via tsx does NOT bundle, so the same relative
 * offset would be wrong in one of the two modes no matter which constant
 * depth you pick. Searching for package.json works in both.
 */
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate aviomancy's package root above ${startDir}`);
    }
    dir = parent;
  }
}

export const PACKAGE_ROOT = findPackageRoot(path.dirname(fileURLToPath(import.meta.url)));

export const BUNDLED_PERSONAS_DIR = path.join(PACKAGE_ROOT, "src", "personas");
export const BUNDLED_SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");

export const PROJECT_PERSONAS_DIR = (repoRoot: string) => path.join(repoRoot, ".aviomancy", "personas");
export const PROJECT_SPELLS_DIR = (repoRoot: string) => path.join(repoRoot, "_spells");
