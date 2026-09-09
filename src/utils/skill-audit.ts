import path from "node:path";
import fsExtra from "fs-extra";
const { readdir, readFile, stat, pathExists, copy, ensureDir, writeFile } = fsExtra;
import {
  BUNDLED_SKILLS_DIR,
  PROJECT_PLUGINS_DIR,
  PROJECT_SKILLS_DIR,
} from "./paths.js";
import {
  type Cast,
  CAST_MAP,
  getSkillIdForCast,
  normalizeCast,
  transformSkillFrontmatterForCast,
} from "./cast.js";

export type SkillSyncStatus = "current" | "outdated" | "available" | "local";

export async function detectProjectCast(repoRoot: string, override?: string): Promise<Cast> {
  if (override) {
    const normalized = normalizeCast(override);
    if (!normalized) throw new Error(`invalid cast "${override}" — expected "wizard" or "valley"`);
    return normalized;
  }
  const configPath = path.join(repoRoot, ".hocus", "config.json");
  if (await pathExists(configPath)) {
    try {
      const parsed = JSON.parse(await readFile(configPath, "utf8"));
      if (parsed.cast === "valley" || parsed.cast === "wizard") return parsed.cast as Cast;
    } catch {}
  }
  const personasDir = path.join(repoRoot, ".hocus", "personas");
  if (await pathExists(personasDir)) {
    const files = (await readdir(personasDir).catch(() => [] as string[])).filter((f) =>
      f.endsWith(".soul.md"),
    );
    let wizardCount = 0;
    let valleyCount = 0;
    const wizardSlugs = new Set(Object.values(CAST_MAP).map((v) => v.wizardSlug));
    const valleySlugs = new Set(Object.keys(CAST_MAP));
    for (const file of files) {
      const slug = path.basename(file, ".soul.md");
      if (wizardSlugs.has(slug)) wizardCount++;
      if (valleySlugs.has(slug)) valleyCount++;
    }
    if (wizardCount > valleyCount) return "wizard";
    if (valleyCount > wizardCount) return "valley";
  }
  return "wizard";
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
  cast: Cast,
  installedPath?: string,
): Promise<boolean> {
  const src = path.join(BUNDLED_SKILLS_DIR, bundledSkillId);
  const s = await stat(src).catch(() => undefined);
  if (!s?.isDirectory()) return false;

  const targetSkillName = getSkillIdForCast(bundledSkillId, cast);
  const pluginNames = await detectPluginNames(repoRoot);
  const existingPath =
    installedPath ?? (await findInstalledSkillPath(repoRoot, targetSkillName, pluginNames));
  if (!existingPath) return true;

  const existingRaw = await readFile(path.join(existingPath, "SKILL.md"), "utf8").catch(() => "");
  const bundledRaw = await readFile(path.join(src, "SKILL.md"), "utf8").catch(() => "");
  const transformedBundled = transformSkillFrontmatterForCast(bundledRaw, cast);
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
  cast: Cast,
): Promise<string | undefined> {
  const bundledSkills = (await readdir(BUNDLED_SKILLS_DIR)).filter(
    (f) => !f.startsWith(".") && f !== "example-skill",
  );
  for (const bundledId of bundledSkills) {
    if (getSkillIdForCast(bundledId, cast) === skillId) return bundledId;
    if (bundledId === skillId) return bundledId;
  }
  return undefined;
}

export async function buildSkillSyncMap(repoRoot: string): Promise<Map<string, SkillSyncStatus>> {
  const cast = await detectProjectCast(repoRoot);
  const pluginNames = await detectPluginNames(repoRoot);
  const syncMap = new Map<string, SkillSyncStatus>();

  const bundledSkills = (await readdir(BUNDLED_SKILLS_DIR)).filter(
    (f) => !f.startsWith(".") && f !== "example-skill",
  );

  for (const bundledId of bundledSkills) {
    const targetName = getSkillIdForCast(bundledId, cast);
    const installedPath = await findInstalledSkillPath(repoRoot, targetName, pluginNames);
    if (!installedPath) {
      syncMap.set(bundledId, "available");
      continue;
    }
    const outdated = await bundledSkillNeedsUpdate(repoRoot, bundledId, cast, installedPath);
    syncMap.set(targetName, outdated ? "outdated" : "current");
    syncMap.set(bundledId, outdated ? "outdated" : "current");
  }

  return syncMap;
}

export async function upgradeSingleSkill(repoRoot: string, skillId: string): Promise<boolean> {
  const cast = await detectProjectCast(repoRoot);
  const bundledId = await resolveBundledSkillId(repoRoot, skillId, cast);
  if (!bundledId) return false;

  const src = path.join(BUNDLED_SKILLS_DIR, bundledId);
  const targetSkillName = getSkillIdForCast(bundledId, cast);
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
      const patched = transformSkillFrontmatterForCast(raw, cast);
      if (patched !== raw) await writeFile(skillFile, patched, "utf8");
    }
  }

  return true;
}
