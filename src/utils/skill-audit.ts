import path from "node:path";
import fsExtra from "fs-extra";
const { readdir, readFile, stat, pathExists, copy, ensureDir, writeFile } = fsExtra;
import {
  BUNDLED_SKILLS_DIR,
  PROJECT_PLUGINS_DIR,
  PROJECT_SKILLS_DIR,
} from "./paths.js";
import { normalizeCast, transformSkillFrontmatterForCast } from "./cast.js";
import {
  getSkillIdForProjectCast,
  isBuiltinCast,
  loadCustomCast,
  readProjectCastId,
  transformSkillForProjectCast,
  type ProjectCastId,
} from "./cast-registry.js";

export type SkillSyncStatus = "current" | "outdated" | "available" | "local";

export async function detectProjectCast(repoRoot: string, override?: string): Promise<ProjectCastId> {
  if (override) {
    const normalized = normalizeCast(override);
    if (normalized) return normalized;
    const custom = await loadCustomCast(repoRoot, override);
    if (custom) return override;
    throw new Error(`invalid cast "${override}" — expected "wizard", "valley", or a custom cast id`);
  }
  return readProjectCastId(repoRoot);
}

async function castContext(repoRoot: string, castId: ProjectCastId) {
  const custom = isBuiltinCast(castId) ? undefined : await loadCustomCast(repoRoot, castId);
  return { castId, custom };
}

function skillNameForCast(bundledId: string, castId: ProjectCastId, custom?: Awaited<ReturnType<typeof loadCustomCast>>): string {
  return getSkillIdForProjectCast(bundledId, castId, custom);
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

async function findInstalledSkillPath(
  repoRoot: string,
  skillName: string,
  pluginNames: string[],
): Promise<string | undefined> {
  const checkPaths = [
    path.join(PROJECT_SKILLS_DIR(repoRoot), skillName),
    ...pluginNames.map((p) => path.join(PROJECT_PLUGINS_DIR(repoRoot), p, "skills", skillName)),
    path.join(repoRoot, ".commandcode", "skills", skillName),
    path.join(repoRoot, ".github", "skills", skillName),
    path.join(repoRoot, ".claude", "skills", skillName),
  ];
  for (const p of checkPaths) {
    if (await pathExists(path.join(p, "SKILL.md"))) return p;
  }
  return undefined;
}

export async function bundledSkillNeedsUpdate(
  repoRoot: string,
  bundledSkillId: string,
  castId: ProjectCastId,
  installedPath?: string,
): Promise<boolean> {
  const { custom } = await castContext(repoRoot, castId);
  const src = path.join(BUNDLED_SKILLS_DIR, bundledSkillId);
  const s = await stat(src).catch(() => undefined);
  if (!s?.isDirectory()) return false;

  const targetSkillName = skillNameForCast(bundledSkillId, castId, custom);
  const pluginNames = await detectPluginNames(repoRoot);
  const existingPath =
    installedPath ?? (await findInstalledSkillPath(repoRoot, targetSkillName, pluginNames));
  if (!existingPath) return true;

  const existingRaw = await readFile(path.join(existingPath, "SKILL.md"), "utf8").catch(() => "");
  const bundledRaw = await readFile(path.join(src, "SKILL.md"), "utf8").catch(() => "");
  const transformedBundled = isBuiltinCast(castId)
    ? transformSkillFrontmatterForCast(bundledRaw, castId)
    : transformSkillForProjectCast(bundledRaw, castId, custom);
  if (existingRaw !== transformedBundled) return true;

  const bundledEntries = await readdir(src).catch(() => [] as string[]);
  for (const entry of bundledEntries) {
    if (entry === "SKILL.md") continue;
    const bundledFile = path.join(src, entry);
    const bundledStat = await stat(bundledFile).catch(() => undefined);
    if (!bundledStat || bundledStat.isDirectory()) continue;
    const bundledContent = await readFile(bundledFile, "utf8").catch(() => "");
    const existingContent = await readFile(path.join(existingPath, entry), "utf8").catch(
      () => "__missing__",
    );
    if (bundledContent !== existingContent) return true;
  }
  return false;
}

export async function resolveBundledSkillId(
  repoRoot: string,
  skillId: string,
  castId: ProjectCastId,
): Promise<string | undefined> {
  const { custom } = await castContext(repoRoot, castId);
  const bundledSkills = (await readdir(BUNDLED_SKILLS_DIR)).filter(
    (f) => !f.startsWith(".") && f !== "example-skill",
  );
  for (const bundledId of bundledSkills) {
    if (skillNameForCast(bundledId, castId, custom) === skillId) return bundledId;
    if (bundledId === skillId) return bundledId;
  }
  return undefined;
}

export async function buildSkillSyncMap(repoRoot: string): Promise<Map<string, SkillSyncStatus>> {
  const castId = await detectProjectCast(repoRoot);
  const { custom } = await castContext(repoRoot, castId);
  const pluginNames = await detectPluginNames(repoRoot);
  const syncMap = new Map<string, SkillSyncStatus>();

  const bundledSkills = (await readdir(BUNDLED_SKILLS_DIR)).filter(
    (f) => !f.startsWith(".") && f !== "example-skill",
  );

  for (const bundledId of bundledSkills) {
    const targetName = skillNameForCast(bundledId, castId, custom);
    const installedPath = await findInstalledSkillPath(repoRoot, targetName, pluginNames);
    if (!installedPath) {
      syncMap.set(bundledId, "available");
      continue;
    }
    const outdated = await bundledSkillNeedsUpdate(repoRoot, bundledId, castId, installedPath);
    syncMap.set(targetName, outdated ? "outdated" : "current");
    syncMap.set(bundledId, outdated ? "outdated" : "current");
  }

  return syncMap;
}

export async function upgradeSingleSkill(repoRoot: string, skillId: string): Promise<boolean> {
  const castId = await detectProjectCast(repoRoot);
  const { custom } = await castContext(repoRoot, castId);
  const bundledId = await resolveBundledSkillId(repoRoot, skillId, castId);
  if (!bundledId) return false;

  const src = path.join(BUNDLED_SKILLS_DIR, bundledId);
  const targetSkillName = skillNameForCast(bundledId, castId, custom);
  const pluginNames = await detectPluginNames(repoRoot);
  const hasCommandCode = await pathExists(path.join(repoRoot, ".commandcode"));

  const targets = [
    path.join(PROJECT_SKILLS_DIR(repoRoot), targetSkillName),
    ...pluginNames.map((p) => path.join(PROJECT_PLUGINS_DIR(repoRoot), p, "skills", targetSkillName)),
  ];
  if (hasCommandCode) {
    targets.push(path.join(repoRoot, ".commandcode", "skills", targetSkillName));
  }

  for (const target of targets) {
    await ensureDir(path.dirname(target));
    await copy(src, target, { overwrite: true });
    const skillFile = path.join(target, "SKILL.md");
    if (await pathExists(skillFile)) {
      const raw = await readFile(skillFile, "utf8");
      const patched = isBuiltinCast(castId)
        ? transformSkillFrontmatterForCast(raw, castId)
        : transformSkillForProjectCast(raw, castId, custom);
      if (patched !== raw) await writeFile(skillFile, patched, "utf8");
    }
  }

  return true;
}
