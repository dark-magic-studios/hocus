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
      throw new Error(`Could not locate hocus's package root above ${startDir}`);
    }
    dir = parent;
  }
}

export const PACKAGE_ROOT = findPackageRoot(path.dirname(fileURLToPath(import.meta.url)));

export const BUNDLED_PERSONAS_DIR = path.join(PACKAGE_ROOT, "src", "personas");
export const BUNDLED_SKILLS_DIR = path.join(PACKAGE_ROOT, "src", "templates", "skills");
export const BUNDLED_RULES_DIR = path.join(PACKAGE_ROOT, "src", "templates", "rules");
export const BUNDLED_SPELLS_DIR = path.join(PACKAGE_ROOT, "src", "templates", "spells");

export const PROJECT_PERSONAS_DIR = (repoRoot: string) => path.join(repoRoot, ".hocus", "personas");
export const PROJECT_POTIONS_DIR = (repoRoot: string) => path.join(repoRoot, "_potions");
export const PROJECT_SPELLS_DIR = (repoRoot: string) => path.join(repoRoot, "_spells");
export const PROJECT_SKILLS_DIR = (repoRoot: string) => path.join(repoRoot, ".agents", "skills");
export const PROJECT_RULES_DIR = (repoRoot: string) => path.join(repoRoot, ".agents", "rules");
export const PROJECT_PLUGINS_DIR = (repoRoot: string) => path.join(repoRoot, ".agents", "plugins");
export const PROJECT_LEDGER_FILE = (repoRoot: string) => path.join(repoRoot, ".hocus", "ledger.jsonl");
export const PROJECT_MCP_CONFIG_FILE = (repoRoot: string) => path.join(repoRoot, ".agents", "mcp_config.json");
