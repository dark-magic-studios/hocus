import path from "node:path";
import matter from "gray-matter";
import fsExtra from "fs-extra";
const { pathExists, readdir, readFile, writeFile, remove, stat } = fsExtra;
import { BUNDLED_SKILLS_DIR } from "./paths.js";
import { PROJECT_PERSONAS_DIR, PROJECT_PLUGINS_DIR, PROJECT_SKILLS_DIR } from "./paths.js";
import { PERSONA_SKILL_IDS } from "./cast.js";
import { installSkill } from "./files.js";
import {
  customCastExists,
  describeProjectCast,
  getSkillIdForProjectCast,
  getSoulFilenameForProjectCast,
  isBuiltinCast,
  loadCustomCast,
  readProjectCastId,
  resolveValleySlug,
  transformSkillForProjectCast,
  transformSoulForProjectCast,
  writeProjectCastId,
  type ProjectCastId,
} from "./cast-registry.js";
import { normalizeCast } from "./cast.js";
import { log } from "./log.js";

export interface MigrateCastOptions {
  dryRun?: boolean;
  reinstallSkills?: boolean;
}

async function detectPluginNames(repoRoot: string): Promise<string[]> {
  const pluginsDir = PROJECT_PLUGINS_DIR(repoRoot);
  if (!(await pathExists(pluginsDir))) return [];
  const entries = await readdir(pluginsDir).catch(() => [] as string[]);
  const plugins: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const full = path.join(pluginsDir, entry);
    const s = await stat(full).catch(() => undefined);
    if (s?.isDirectory()) plugins.push(entry);
  }
  return plugins;
}

async function migratePersonas(
  repoRoot: string,
  targetCastId: ProjectCastId,
  custom: Awaited<ReturnType<typeof loadCustomCast>>,
  dryRun: boolean,
): Promise<number> {
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  if (!(await pathExists(personasDir))) return 0;
  const files = (await readdir(personasDir)).filter((f) => f.endsWith(".soul.md"));
  let count = 0;
  for (const file of files) {
    const fullPath = path.join(personasDir, file);
    const raw = await readFile(fullPath, "utf8");
    const transformed = transformSoulForProjectCast(raw, targetCastId, custom);
    const { data } = matter(transformed);
    const character = typeof data.character === "string" ? data.character : path.basename(file, ".soul.md");
    const valleySlug = resolveValleySlug(character) ?? character;
    const targetFile = getSoulFilenameForProjectCast(valleySlug, targetCastId, custom);
    const destPath = path.join(personasDir, targetFile);
    if (dryRun) {
      if (fullPath !== destPath || transformed !== raw) {
        log.planned(path.relative(repoRoot, destPath), describeProjectCast(targetCastId, custom));
        count++;
      }
      continue;
    }
    if (fullPath !== destPath) {
      await writeFile(destPath, transformed, "utf8");
      await remove(fullPath);
      log.info(`migrated persona ${file} -> ${targetFile}`);
    } else if (transformed !== raw) {
      await writeFile(destPath, transformed, "utf8");
      log.info(`updated persona ${file}`);
    } else {
      continue;
    }
    count++;
  }
  return count;
}

async function removeStaleSkills(
  repoRoot: string,
  targetCastId: ProjectCastId,
  custom: Awaited<ReturnType<typeof loadCustomCast>>,
  pluginNames: string[],
  dryRun: boolean,
): Promise<void> {
  const allCastIds = ["valley", "wizard"] as const;
  for (const valleyId of PERSONA_SKILL_IDS) {
    const keepName = getSkillIdForProjectCast(valleyId, targetCastId, custom);
    const staleNames = new Set<string>();
    for (const cast of allCastIds) {
      staleNames.add(getSkillIdForProjectCast(valleyId, cast));
    }
    if (custom) {
      staleNames.add(getSkillIdForProjectCast(valleyId, targetCastId, custom));
    }
    staleNames.delete(keepName);
    for (const staleName of staleNames) {
      const bases = [
        path.join(PROJECT_SKILLS_DIR(repoRoot), staleName),
        ...pluginNames.map((p) => path.join(PROJECT_PLUGINS_DIR(repoRoot), p, "skills", staleName)),
        path.join(repoRoot, ".commandcode", "skills", staleName),
        path.join(repoRoot, ".github", "skills", staleName),
        path.join(repoRoot, ".claude", "skills", staleName),
      ];
      for (const p of bases) {
        if (!(await pathExists(p))) continue;
        if (dryRun) log.planned(path.relative(repoRoot, p), "remove stale skill");
        else {
          await remove(p);
          log.info(`removed stale skill ${path.relative(repoRoot, p)}`);
        }
      }
    }
  }
}

async function reinstallPersonaSkills(
  repoRoot: string,
  targetCastId: ProjectCastId,
  custom: Awaited<ReturnType<typeof loadCustomCast>>,
  pluginNames: string[],
  dryRun: boolean,
): Promise<number> {
  const useCommandCode = await pathExists(path.join(repoRoot, ".commandcode"));
  const useCopilot = await pathExists(path.join(repoRoot, ".github", "skills"));
  const pluginName = pluginNames[0];
  let count = 0;
  for (const bundledId of PERSONA_SKILL_IDS) {
    const src = path.join(BUNDLED_SKILLS_DIR, bundledId);
    if (!(await pathExists(src))) continue;
    const targetSkillName = getSkillIdForProjectCast(bundledId, targetCastId, custom);
    if (dryRun) {
      log.planned(path.join(".agents", "skills", targetSkillName));
      count++;
      continue;
    }
    const targets = await installSkill(src, repoRoot, targetSkillName, {
      pluginName,
      commandCode: useCommandCode,
      copilot: useCopilot,
    });
    for (const target of targets) {
      const skillFile = path.join(target, "SKILL.md");
      if (await pathExists(skillFile)) {
        const raw = await readFile(skillFile, "utf8");
        const patched = transformSkillForProjectCast(raw, targetCastId, custom);
        if (patched !== raw) await writeFile(skillFile, patched, "utf8");
      }
    }
    count++;
  }
  return count;
}

/** Rename personas, skills, and config to match the target cast naming convention. */
export async function migrateProjectCast(
  repoRoot: string,
  targetCastId: ProjectCastId,
  options: MigrateCastOptions = {},
): Promise<{ personas: number; skills: number }> {
  const dryRun = options.dryRun ?? false;
  const normalized = normalizeCast(targetCastId);
  const castId = normalized ?? targetCastId;
  if (!normalized && !(await customCastExists(repoRoot, castId))) {
    throw new Error(
      `unknown cast "${targetCastId}" — use "valley", "wizard", or a custom id from .hocus/casts/`,
    );
  }
  const custom = isBuiltinCast(castId) ? undefined : await loadCustomCast(repoRoot, castId);
  const currentCast = await readProjectCastId(repoRoot);
  if (currentCast === castId && !options.reinstallSkills) {
    log.info(`already on cast "${castId}" (${describeProjectCast(castId, custom)})`);
    return { personas: 0, skills: 0 };
  }
  const pluginNames = await detectPluginNames(repoRoot);
  const personas = await migratePersonas(repoRoot, castId, custom, dryRun);
  await removeStaleSkills(repoRoot, castId, custom, pluginNames, dryRun);
  let skills = 0;
  if (options.reinstallSkills !== false) {
    skills = await reinstallPersonaSkills(repoRoot, castId, custom, pluginNames, dryRun);
  }
  if (!dryRun) {
    await writeProjectCastId(repoRoot, castId);
    log.ok(`recast to "${castId}" (${describeProjectCast(castId, custom)}) — ${personas} persona(s), ${skills} skill(s)`);
  }
  return { personas, skills };
}
