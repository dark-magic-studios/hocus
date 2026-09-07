import path from "node:path";
import fsExtra from "fs-extra";
const { readdir, readFile, writeFile, copy, pathExists, remove, stat, ensureDir } = fsExtra;
import { log } from "../utils/log.js";
import {
  BUNDLED_PERSONAS_DIR,
  BUNDLED_SKILLS_DIR,
  PROJECT_PERSONAS_DIR,
  PROJECT_PLUGINS_DIR,
  PROJECT_SKILLS_DIR,
} from "../utils/paths.js";
import {
  type Cast,
  CAST_MAP,
  normalizeCast,
  describeCast,
  getSkillIdForCast,
  transformSkillFrontmatterForCast,
  transformSoulForCast,
  getSoulFilenameForCast,
} from "../utils/cast.js";

export interface UpgradeOptions {
  repoRoot: string;
  dryRun?: boolean;
  force?: boolean;
  personas?: boolean;
  skills?: boolean;
  cast?: string;
}

async function detectCast(repoRoot: string, override?: string): Promise<Cast> {
  if (override) {
    const normalized = normalizeCast(override);
    if (!normalized) throw new Error(`invalid --cast value "${override}" — expected "wizard" or "valley"`);
    return normalized;
  }
  const configPath = path.join(repoRoot, ".hocus", "config.json");
  if (await pathExists(configPath)) {
    try {
      const parsed = JSON.parse(await readFile(configPath, "utf8"));
      if (parsed.cast === "valley" || parsed.cast === "wizard") return parsed.cast as Cast;
    } catch {}
  }
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  if (await pathExists(personasDir)) {
    const files = (await readdir(personasDir).catch(() => [] as string[])).filter((f) => f.endsWith(".soul.md"));
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
    if (!s?.isDirectory()) continue;
    plugins.push(entry);
  }
  return plugins;
}

export async function runUpgrade({
  repoRoot,
  dryRun = false,
  force = false,
  personas = true,
  skills = true,
  cast: castOpt,
}: UpgradeOptions): Promise<void> {
  log.heading(`upgrading hocus in ${repoRoot}`);
  if (dryRun) log.info("dry run — no files will be written");

  const hasHocus = await pathExists(path.join(repoRoot, ".hocus"));
  const hasAgents = await pathExists(path.join(repoRoot, ".agents"));
  if (!hasHocus && !hasAgents) {
    log.warn(`no .hocus/ or .agents/ found — run hocus init first`);
    return;
  }

  const cast = await detectCast(repoRoot, castOpt);
  log.info(`using ${describeCast(cast)} cast`);

  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const hasPersonasDir = await pathExists(personasDir);

  let personaUpdated = 0;
  let personaUnchanged = 0;
  let personaCreated = 0;

  if (personas) {
    if (!hasPersonasDir) {
      log.warn(`no ${path.relative(repoRoot, personasDir)} found — run hocus init first`);
    } else {
      const bundledFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
      for (const file of bundledFiles) {
        const valleySlug = path.basename(file, ".soul.md");
        const targetFile = getSoulFilenameForCast(valleySlug, cast);
        const dest = path.join(personasDir, targetFile);
        const bundledRaw = await readFile(path.join(BUNDLED_PERSONAS_DIR, file), "utf8");
        const transformed = transformSoulForCast(bundledRaw, cast);

        const exists = await pathExists(dest);
        if (!exists) {
          if (dryRun) {
            log.planned(path.relative(repoRoot, dest), "new persona");
          } else {
            await writeFile(dest, transformed, "utf8");
            log.ok(`created ${path.relative(repoRoot, dest)}`);
          }
          personaCreated++;
          continue;
        }

        const current = await readFile(dest, "utf8");
        if (current === transformed && !force) {
          personaUnchanged++;
          continue;
        }

        if (dryRun) {
          log.planned(path.relative(repoRoot, dest), "update persona");
        } else {
          await writeFile(dest, transformed, "utf8");
          log.ok(`updated ${path.relative(repoRoot, dest)}`);
        }
        personaUpdated++;
      }

      // Remove stale opposite-cast persona files
      const staleCheck = async (doRemove: boolean) => {
        for (const file of await readdir(personasDir).catch(() => [] as string[])) {
          if (!file.endsWith(".soul.md")) continue;
          const slug = path.basename(file, ".soul.md");
          let valleySlug: string | undefined;
          if (CAST_MAP[slug]) valleySlug = slug;
          else valleySlug = Object.entries(CAST_MAP).find(([, v]) => v.wizardSlug === slug)?.[0];
          if (!valleySlug) continue;
          const expected = getSoulFilenameForCast(valleySlug, cast);
          if (file !== expected && (await pathExists(path.join(personasDir, expected)))) {
            const stalePath = path.join(personasDir, file);
            if (doRemove) {
              await remove(stalePath);
              log.info(`removed stale ${path.relative(repoRoot, stalePath)}`);
            } else {
              log.planned(path.relative(repoRoot, stalePath), "remove stale persona");
            }
          }
        }
      };
      if (dryRun) await staleCheck(false);
      else await staleCheck(true);

      if (personaUpdated === 0 && personaCreated === 0) {
        log.ok(`personas up to date (${personaUnchanged} unchanged)`);
      } else {
        log.ok(`personas: ${personaUpdated} updated, ${personaCreated} created, ${personaUnchanged} unchanged`);
      }
    }
  }

  let skillUpdated = 0;
  let skillUnchanged = 0;
  let skillCreated = 0;

  if (skills) {
    const bundledSkills = (await readdir(BUNDLED_SKILLS_DIR)).filter(
      (f) => !f.startsWith(".") && f !== "example-skill",
    );
    const pluginNames = await detectPluginNames(repoRoot);
    const hasCommandCode = await pathExists(path.join(repoRoot, ".commandcode"));
    const hasAnySkillLocation = hasAgents || pluginNames.length > 0 || hasCommandCode;

    if (!hasAnySkillLocation && !hasPersonasDir) {
      log.warn(`no skill locations found — run hocus init first`);
    } else {
      for (const skill of bundledSkills) {
        const src = path.join(BUNDLED_SKILLS_DIR, skill);
        const s = await stat(src).catch(() => undefined);
        if (!s?.isDirectory()) continue;

        const targetSkillName = getSkillIdForCast(skill, cast);
        const wizardName = getSkillIdForCast(skill, "wizard");
        const valleyName = skill;
        const oppositeName = cast === "wizard" ? valleyName : wizardName;
        const isPersonaSkill = oppositeName !== targetSkillName;

        const checkPaths = [
          path.join(PROJECT_SKILLS_DIR(repoRoot), targetSkillName),
          ...pluginNames.map((p) => path.join(PROJECT_PLUGINS_DIR(repoRoot), p, "skills", targetSkillName)),
        ];
        if (hasCommandCode) {
          checkPaths.push(path.join(repoRoot, ".commandcode", "skills", targetSkillName));
        }

        const existsChecks = await Promise.all(checkPaths.map((p) => pathExists(p)));
        const anyExists = existsChecks.some(Boolean);

        const oppositePaths = isPersonaSkill
          ? [
              path.join(PROJECT_SKILLS_DIR(repoRoot), oppositeName),
              ...pluginNames.map((p) => path.join(PROJECT_PLUGINS_DIR(repoRoot), p, "skills", oppositeName)),
              ...(hasCommandCode ? [path.join(repoRoot, ".commandcode", "skills", oppositeName)] : []),
            ]
          : [];
        const oppositeExists = isPersonaSkill
          ? (await Promise.all(oppositePaths.map((p) => pathExists(p)))).some(Boolean)
          : false;

        // For fresh projects with no skills installed, skip creating all bundled skills via upgrade
        // Only create if at least one variant existed or project already has hocus
        if (!anyExists && !oppositeExists && !hasHocus) {
          skillUnchanged++;
          continue;
        }

        // Determine if update is needed
        let needsUpdate = false;
        let isNew = false;

        if (anyExists) {
          let existingPath: string | undefined;
          for (let i = 0; i < checkPaths.length; i++) {
            if (existsChecks[i]) {
              existingPath = checkPaths[i];
              break;
            }
          }
          if (existingPath) {
            const existingRaw = await readFile(path.join(existingPath, "SKILL.md"), "utf8").catch(() => "");
            const bundledRaw = await readFile(path.join(src, "SKILL.md"), "utf8").catch(() => "");
            const transformedBundled = transformSkillFrontmatterForCast(bundledRaw, cast);
            if (existingRaw !== transformedBundled) needsUpdate = true;
            if (!needsUpdate) {
              const bundledEntries = await readdir(src).catch(() => [] as string[]);
              for (const entry of bundledEntries) {
                if (entry === "SKILL.md") continue;
                const bundledFile = path.join(src, entry);
                const existingFile = path.join(existingPath, entry);
                const bundledStat = await stat(bundledFile).catch(() => undefined);
                if (!bundledStat || bundledStat.isDirectory()) continue;
                const bundledContent = await readFile(bundledFile, "utf8").catch(() => "");
                const existingContent = await readFile(existingFile, "utf8").catch(() => "__missing__");
                if (bundledContent !== existingContent) {
                  needsUpdate = true;
                  break;
                }
              }
            }
          }
        } else if (oppositeExists) {
          needsUpdate = true;
          isNew = true;
        } else {
          // Neither variant exists but project has hocus — this is a new bundled skill
          needsUpdate = true;
          isNew = true;
        }

        if (!needsUpdate && !force) {
          skillUnchanged++;
          continue;
        }

        if (dryRun) {
          if (isNew) {
            log.planned(path.relative(repoRoot, path.join(PROJECT_SKILLS_DIR(repoRoot), targetSkillName)), "new skill");
            for (const pn of pluginNames) {
              log.planned(path.relative(repoRoot, path.join(PROJECT_PLUGINS_DIR(repoRoot), pn, "skills", targetSkillName)), "new skill");
            }
            if (hasCommandCode) log.planned(path.relative(repoRoot, path.join(repoRoot, ".commandcode", "skills", targetSkillName)), "new skill");
          } else {
            log.planned(path.relative(repoRoot, path.join(PROJECT_SKILLS_DIR(repoRoot), targetSkillName)), "update skill");
            for (const pn of pluginNames) {
              log.planned(path.relative(repoRoot, path.join(PROJECT_PLUGINS_DIR(repoRoot), pn, "skills", targetSkillName)), "update skill");
            }
            if (hasCommandCode) log.planned(path.relative(repoRoot, path.join(repoRoot, ".commandcode", "skills", targetSkillName)), "update skill");
          }
          if (isNew) skillCreated++;
          else skillUpdated++;
          continue;
        }

        if (oppositeExists) {
          for (const opp of oppositePaths) {
            if (await pathExists(opp)) {
              await remove(opp);
              log.info(`removed stale ${path.relative(repoRoot, opp)}`);
            }
          }
        }

        const targets = [
          path.join(PROJECT_SKILLS_DIR(repoRoot), targetSkillName),
          ...pluginNames.map((p) => path.join(PROJECT_PLUGINS_DIR(repoRoot), p, "skills", targetSkillName)),
        ];
        if (hasCommandCode) targets.push(path.join(repoRoot, ".commandcode", "skills", targetSkillName));

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
        if (isNew) {
          log.ok(`created ${targetSkillName} -> ${targets.map((t) => path.relative(repoRoot, t)).join(", ")}`);
          skillCreated++;
        } else {
          log.ok(`updated ${targetSkillName}`);
          skillUpdated++;
        }
      }

      if (skillUpdated === 0 && skillCreated === 0) {
        log.ok(`skills up to date (${skillUnchanged} unchanged)`);
      } else {
        log.ok(`skills: ${skillUpdated} updated, ${skillCreated} created, ${skillUnchanged} unchanged`);
      }
    }
  }

  if (!dryRun && (personaUpdated > 0 || personaCreated > 0 || skillUpdated > 0 || skillCreated > 0)) {
    log.info("run `hocus cast` to recompile agents if persona sources changed");
  }

  log.ok("upgrade complete");
}
