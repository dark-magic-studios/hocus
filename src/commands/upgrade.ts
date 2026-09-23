import { createHash } from "node:crypto";
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

export interface UpgradeScope {
  personas: boolean;
  skills: boolean;
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


/**
 * Decides which sections `hocus upgrade` touches from raw CLI tokens.
 * Exact token matching — a substring check would treat `--no-personas`
 * as `--personas`. Positive flags select; negative flags subtract.
 */
export function resolveUpgradeScope(argv: readonly string[]): UpgradeScope {
  const hasPersonas = argv.includes("--personas");
  const hasSkills = argv.includes("--skills");
  const anyPositive = hasPersonas || hasSkills;
  return {
    personas: (anyPositive ? hasPersonas : true) && !argv.includes("--no-personas"),
    skills: (anyPositive ? hasSkills : true) && !argv.includes("--no-skills"),
  };
}

export const UPGRADE_MANIFEST_FILE = (repoRoot: string) => path.join(repoRoot, ".hocus", "upgrade-manifest.json");

interface UpgradeManifest {
  version: 1;
  /** repo-relative posix path -> sha256 of the content hocus last wrote there */
  files: Record<string, string>;
}

async function loadManifest(repoRoot: string): Promise<UpgradeManifest> {
  const file = UPGRADE_MANIFEST_FILE(repoRoot);
  if (!(await pathExists(file))) return { version: 1, files: {} };
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    if (parsed && typeof parsed.files === "object" && parsed.files !== null) {
      return { version: 1, files: { ...parsed.files } };
    }
  } catch {}
  log.warn(`${path.relative(repoRoot, file)} is unreadable — treating all differing files as user-modified`);
  return { version: 1, files: {} };
}

async function saveManifest(repoRoot: string, manifest: UpgradeManifest): Promise<void> {
  const file = UPGRADE_MANIFEST_FILE(repoRoot);
  await ensureDir(path.dirname(file));
  await writeFile(file, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

/**
 * Marks files hocus just wrote as pristine so a later `hocus upgrade` may
 * overwrite them. Directories are expanded recursively; missing paths are skipped.
 */
export async function recordPristineFiles(repoRoot: string, absPaths: readonly string[]): Promise<void> {
  const manifest = await loadManifest(repoRoot);
  for (const p of absPaths) {
    const s = await stat(p).catch(() => undefined);
    if (!s) continue;
    const files = s.isDirectory() ? (await listFilesRecursive(p)).map((f) => path.join(p, f)) : [p];
    for (const file of files) {
      manifest.files[relKey(repoRoot, file)] = sha256(await readFile(file));
    }
  }
  await saveManifest(repoRoot, manifest);
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function relKey(repoRoot: string, file: string): string {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

interface SyncContext {
  repoRoot: string;
  dryRun: boolean;
  force: boolean;
  manifest: UpgradeManifest;
}

type SyncResult = "created" | "updated" | "unchanged" | "conflict";

/**
 * Writes one hocus-managed file without clobbering user edits.
 * - missing → create
 * - identical to bundled → unchanged (hash recorded as pristine)
 * - hash matches what hocus last wrote (untouched) or --force → overwrite
 * - otherwise user-modified → keep it, write bundled version to `<file>.new`
 */
async function syncFile(ctx: SyncContext, dest: string, content: Buffer, label: string): Promise<SyncResult> {
  const rel = relKey(ctx.repoRoot, dest);
  const bundledHash = sha256(content);

  if (!(await pathExists(dest))) {
    if (ctx.dryRun) {
      log.planned(rel, `new ${label}`);
    } else {
      await ensureDir(path.dirname(dest));
      await writeFile(dest, content);
    }
    ctx.manifest.files[rel] = bundledHash;
    return "created";
  }

  const current = await readFile(dest);
  if (current.equals(content)) {
    ctx.manifest.files[rel] = bundledHash;
    return "unchanged";
  }

  const recorded = ctx.manifest.files[rel];
  if (ctx.force || (recorded !== undefined && recorded === sha256(current))) {
    if (ctx.dryRun) log.planned(rel, `update ${label}`);
    else await writeFile(dest, content);
    ctx.manifest.files[rel] = bundledHash;
    return "updated";
  }

  const sidecar = `${dest}.new`;
  if (ctx.dryRun) {
    log.planned(relKey(ctx.repoRoot, sidecar), `bundled ${label} (${rel} has local changes)`);
  } else {
    await writeFile(sidecar, content);
    log.warn(`${rel} has local changes — kept it; bundled version written to ${rel}.new (use --force to overwrite)`);
  }
  return "conflict";
}

/** True when `file` is exactly what hocus wrote (by recorded hash) or matches the expected bundled content. */
async function isPristine(ctx: SyncContext, file: string, expected: Buffer | undefined): Promise<boolean> {
  const current = await readFile(file).catch(() => undefined);
  if (!current) return false;
  if (expected && current.equals(expected)) return true;
  const recorded = ctx.manifest.files[relKey(ctx.repoRoot, file)];
  return recorded !== undefined && recorded === sha256(current);
}

async function listFilesRecursive(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir).catch(() => [] as string[])) {
    const full = path.join(dir, entry);
    const s = await stat(full).catch(() => undefined);
    if (!s) continue;
    const rel = prefix ? path.join(prefix, entry) : entry;
    if (s.isDirectory()) out.push(...(await listFilesRecursive(full, rel)));
    else out.push(rel);
  }
  return out;
}

/** Bundled skill contents as they should land on disk for `cast` (root SKILL.md frontmatter transformed). */
async function collectSkillFiles(src: string, cast: Cast): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  for (const rel of await listFilesRecursive(src)) {
    const raw = await readFile(path.join(src, rel));
    files.set(rel, rel === "SKILL.md" ? Buffer.from(transformSkillFrontmatterForCast(raw.toString("utf8"), cast), "utf8") : raw);
  }
  return files;
}

/** Removes a stale opposite-cast file/dir only when every file in it is pristine. */
async function removeStaleIfPristine(ctx: SyncContext, target: string, expected: Map<string, Buffer>, kind: string): Promise<void> {
  const rel = relKey(ctx.repoRoot, target);
  const s = await stat(target).catch(() => undefined);
  if (!s) return;
  const entries = s.isDirectory()
    ? (await listFilesRecursive(target)).map((f) => ({ file: path.join(target, f), expected: expected.get(f) }))
    : [{ file: target, expected: expected.get("") }];
  for (const { file, expected: exp } of entries) {
    if (!(await isPristine(ctx, file, exp))) {
      log.warn(`kept stale ${rel} — it has local changes; remove it manually once merged`);
      return;
    }
  }
  if (ctx.dryRun) {
    log.planned(rel, `remove stale ${kind}`);
    return;
  }
  await remove(target);
  for (const { file } of entries) delete ctx.manifest.files[relKey(ctx.repoRoot, file)];
  log.info(`removed stale ${rel}`);
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
  const oppositeCast: Cast = cast === "wizard" ? "valley" : "wizard";
  log.info(`using ${describeCast(cast)} cast`);

  const ctx: SyncContext = { repoRoot, dryRun, force, manifest: await loadManifest(repoRoot) };

  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const hasPersonasDir = await pathExists(personasDir);

  let personaUpdated = 0;
  let personaUnchanged = 0;
  let personaCreated = 0;
  let personaConflicts = 0;

  if (personas) {
    if (!hasPersonasDir) {
      log.warn(`no ${path.relative(repoRoot, personasDir)} found — run hocus init first`);
    } else {
      const bundledFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
      // opposite-cast filename -> the content hocus would have written there
      const oppositeExpected = new Map<string, Buffer>();
      for (const file of bundledFiles) {
        const valleySlug = path.basename(file, ".soul.md");
        const targetFile = getSoulFilenameForCast(valleySlug, cast);
        const dest = path.join(personasDir, targetFile);
        const bundledRaw = await readFile(path.join(BUNDLED_PERSONAS_DIR, file), "utf8");
        const transformed = transformSoulForCast(bundledRaw, cast);
        oppositeExpected.set(
          getSoulFilenameForCast(valleySlug, oppositeCast),
          Buffer.from(transformSoulForCast(bundledRaw, oppositeCast), "utf8"),
        );

        const result = await syncFile(ctx, dest, Buffer.from(transformed, "utf8"), "persona");
        if (result === "created") {
          if (!dryRun) log.ok(`created ${path.relative(repoRoot, dest)}`);
          personaCreated++;
        } else if (result === "updated") {
          if (!dryRun) log.ok(`updated ${path.relative(repoRoot, dest)}`);
          personaUpdated++;
        } else if (result === "conflict") {
          personaConflicts++;
        } else {
          personaUnchanged++;
        }
      }

      // Remove stale opposite-cast persona files (never user-modified ones)
      for (const file of await readdir(personasDir).catch(() => [] as string[])) {
        if (!file.endsWith(".soul.md")) continue;
        const slug = path.basename(file, ".soul.md");
        let valleySlug: string | undefined;
        if (CAST_MAP[slug]) valleySlug = slug;
        else valleySlug = Object.entries(CAST_MAP).find(([, v]) => v.wizardSlug === slug)?.[0];
        if (!valleySlug) continue;
        const expected = getSoulFilenameForCast(valleySlug, cast);
        if (file !== expected && (await pathExists(path.join(personasDir, expected)))) {
          const exp = oppositeExpected.get(file);
          await removeStaleIfPristine(ctx, path.join(personasDir, file), new Map(exp ? [["", exp]] : []), "persona");
        }
      }

      const conflictNote = personaConflicts > 0 ? `, ${personaConflicts} kept (local changes)` : "";
      if (personaUpdated === 0 && personaCreated === 0) {
        log.ok(`personas up to date (${personaUnchanged} unchanged${conflictNote})`);
      } else {
        log.ok(`personas: ${personaUpdated} updated, ${personaCreated} created, ${personaUnchanged} unchanged${conflictNote}`);
      }
    }
  }

  let skillUpdated = 0;
  let skillUnchanged = 0;
  let skillCreated = 0;
  let skillConflicts = 0;

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
        const oppositeName = getSkillIdForCast(skill, oppositeCast);
        const isPersonaSkill = oppositeName !== targetSkillName;

        const targets = [
          path.join(PROJECT_SKILLS_DIR(repoRoot), targetSkillName),
          ...pluginNames.map((p) => path.join(PROJECT_PLUGINS_DIR(repoRoot), p, "skills", targetSkillName)),
        ];
        if (hasCommandCode) targets.push(path.join(repoRoot, ".commandcode", "skills", targetSkillName));

        const anyExists = (await Promise.all(targets.map((p) => pathExists(p)))).some(Boolean);

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

        const bundledFiles = await collectSkillFiles(src, cast);
        const tally: Record<SyncResult, number> = { created: 0, updated: 0, unchanged: 0, conflict: 0 };
        for (const target of targets) {
          for (const [rel, content] of bundledFiles) {
            tally[await syncFile(ctx, path.join(target, rel), content, "skill")]++;
          }
        }

        if (oppositeExists) {
          const oppositeFiles = await collectSkillFiles(src, oppositeCast);
          for (const opp of oppositePaths) {
            await removeStaleIfPristine(ctx, opp, oppositeFiles, "skill");
          }
        }

        if (!anyExists && tally.created > 0) {
          if (!dryRun) log.ok(`created ${targetSkillName} -> ${targets.map((t) => path.relative(repoRoot, t)).join(", ")}`);
          skillCreated++;
        } else if (tally.created > 0 || tally.updated > 0) {
          if (!dryRun) log.ok(`updated ${targetSkillName}`);
          skillUpdated++;
        } else {
          skillUnchanged++;
        }
        if (tally.conflict > 0) skillConflicts++;
      }

      const conflictNote = skillConflicts > 0 ? `, ${skillConflicts} with kept local changes` : "";
      if (skillUpdated === 0 && skillCreated === 0) {
        log.ok(`skills up to date (${skillUnchanged} unchanged${conflictNote})`);
      } else {
        log.ok(`skills: ${skillUpdated} updated, ${skillCreated} created, ${skillUnchanged} unchanged${conflictNote}`);
      }
    }
  }

  // Only persist tracking once .hocus/ exists — creating it here would flip hasHocus-based detection.
  if (!dryRun && hasHocus) {
    await saveManifest(repoRoot, ctx.manifest);
  }

  if (!dryRun && (personaUpdated > 0 || personaCreated > 0 || skillUpdated > 0 || skillCreated > 0)) {
    log.info("run `hocus cast` to recompile agents if persona sources changed");
  }
  if (personaConflicts > 0 || skillConflicts > 0) {
    log.warn("some files had local changes — review the .new files and merge, or rerun with --force");
  }

  log.ok("upgrade complete");
}
