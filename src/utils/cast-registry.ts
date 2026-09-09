import path from "node:path";
import matter from "gray-matter";
import fsExtra from "fs-extra";
const { pathExists, readdir, readFile, writeFile, remove, ensureDir } = fsExtra;
import type { CustomCastConfig, CustomCastPersona } from "../schema/cast-config.js";
import {
  CAST_MAP,
  PERSONA_SKILL_IDS,
  type Cast,
  describeCast,
  getSkillIdForCast,
  getSoulFilenameForCast,
  transformSkillFrontmatterForCast,
  transformSoulForCast,
} from "./cast.js";
import { PROJECT_CASTS_DIR, PROJECT_CONFIG_FILE } from "./paths.js";

export type ProjectCastId = string;

export interface CastInfo {
  id: ProjectCastId;
  label: string;
  builtin: boolean;
}

const BUILTIN_CASTS: CastInfo[] = [
  { id: "valley", label: describeCast("valley"), builtin: true },
  { id: "wizard", label: describeCast("wizard"), builtin: true },
];

export function isBuiltinCast(id: string): id is Cast {
  return id === "valley" || id === "wizard";
}

export function customCastPath(repoRoot: string, castId: string): string {
  return path.join(PROJECT_CASTS_DIR(repoRoot), `${castId}.json`);
}

export async function customCastExists(repoRoot: string, castId: string): Promise<boolean> {
  if (isBuiltinCast(castId)) return true;
  return pathExists(customCastPath(repoRoot, castId));
}

export async function loadCustomCast(repoRoot: string, castId: string): Promise<CustomCastConfig | undefined> {
  const file = customCastPath(repoRoot, castId);
  if (!(await pathExists(file))) return undefined;
  const parsed = JSON.parse(await readFile(file, "utf8")) as CustomCastConfig;
  if (!parsed.label || !parsed.personas) {
    throw new Error(`invalid custom cast config: ${path.relative(repoRoot, file)}`);
  }
  return parsed;
}

export async function listAvailableCasts(repoRoot: string): Promise<CastInfo[]> {
  const casts = [...BUILTIN_CASTS];
  const dir = PROJECT_CASTS_DIR(repoRoot);
  if (!(await pathExists(dir))) return casts;
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const id = file.slice(0, -".json".length);
    if (isBuiltinCast(id)) continue;
    try {
      const config = await loadCustomCast(repoRoot, id);
      casts.push({ id, label: config?.label ?? id, builtin: false });
    } catch {
      casts.push({ id, label: `${id} (invalid)`, builtin: false });
    }
  }
  return casts;
}

export async function readProjectCastId(repoRoot: string): Promise<ProjectCastId> {
  const configPath = PROJECT_CONFIG_FILE(repoRoot);
  if (await pathExists(configPath)) {
    try {
      const parsed = JSON.parse(await readFile(configPath, "utf8"));
      if (typeof parsed.cast === "string" && parsed.cast.length > 0) return parsed.cast;
    } catch {}
  }
  return "wizard";
}

export async function writeProjectCastId(repoRoot: string, castId: ProjectCastId): Promise<void> {
  const configPath = PROJECT_CONFIG_FILE(repoRoot);
  await ensureDir(path.dirname(configPath));
  let existing: Record<string, unknown> = {};
  if (await pathExists(configPath)) {
    try {
      existing = JSON.parse(await readFile(configPath, "utf8"));
    } catch {}
  }
  await writeFile(configPath, JSON.stringify({ ...existing, cast: castId }, null, 2) + "\n", "utf8");
}

/** Resolve any character/slug to its canonical valley slug. */
export function resolveValleySlug(characterOrSlug: string): string | undefined {
  if (CAST_MAP[characterOrSlug]) return characterOrSlug;
  const byWizard = Object.entries(CAST_MAP).find(([, v]) => v.wizardSlug === characterOrSlug);
  if (byWizard) return byWizard[0];
  const byDisplay = Object.entries(CAST_MAP).find(
    ([, v]) => v.valleyDisplay === characterOrSlug || v.wizardDisplay === characterOrSlug,
  );
  return byDisplay?.[0];
}

function valleySkillPrefix(valleySlug: string): string {
  if (valleySlug === "big-head") return "bighead";
  if (valleySlug === "jian-yang") return "jianyang";
  if (valleySlug === "peter-gregory") return "peter";
  return valleySlug;
}

function detectValleySlugFromSkillId(skillId: string): string | undefined {
  for (const valleySlug of Object.keys(CAST_MAP)) {
    const prefix = valleySkillPrefix(valleySlug);
    if (skillId === prefix || skillId.startsWith(`${prefix}-`)) return valleySlug;
  }
  for (const [, entry] of Object.entries(CAST_MAP)) {
    const wp = entry.wizardSlug;
    if (skillId === wp || skillId.startsWith(`${wp}-`)) {
      return Object.entries(CAST_MAP).find(([, v]) => v.wizardSlug === wp)?.[0];
    }
  }
  return undefined;
}

export function getPersonaNaming(
  valleySlug: string,
  castId: ProjectCastId,
  custom?: CustomCastConfig,
): CustomCastPersona & { aliases: { valley: string; occult: string } } {
  const entry = CAST_MAP[valleySlug];
  if (!entry) {
    return {
      character: valleySlug,
      display_name: valleySlug,
      aliases: { valley: valleySlug, occult: valleySlug },
    };
  }
  if (isBuiltinCast(castId)) {
    return {
      character: castId === "valley" ? valleySlug : entry.wizardSlug,
      display_name: castId === "valley" ? entry.valleyDisplay : entry.wizardDisplay,
      aliases: { valley: entry.valleyDisplay, occult: entry.wizardDisplay },
    };
  }
  const mapped = custom?.personas[valleySlug];
  if (mapped) {
    return {
      ...mapped,
      aliases: { valley: entry.valleyDisplay, occult: entry.wizardDisplay },
    };
  }
  return {
    character: valleySlug,
    display_name: entry.valleyDisplay,
    aliases: { valley: entry.valleyDisplay, occult: entry.wizardDisplay },
  };
}

export function getSkillIdForProjectCast(
  skillId: string,
  castId: ProjectCastId,
  custom?: CustomCastConfig,
): string {
  if (isBuiltinCast(castId)) return getSkillIdForCast(skillId, castId);
  const canonicalValleyId = PERSONA_SKILL_IDS.has(skillId)
    ? skillId
    : getSkillIdForCast(skillId, "valley");
  if (!PERSONA_SKILL_IDS.has(canonicalValleyId)) return skillId;
  const slug = detectValleySlugFromSkillId(canonicalValleyId);
  if (!slug) return skillId;
  const naming = getPersonaNaming(slug, castId, custom);
  const suffix = canonicalValleyId.includes("-")
    ? canonicalValleyId.slice(canonicalValleyId.indexOf("-"))
    : "";
  return `${naming.character}${suffix}`;
}

export function transformSoulForProjectCast(
  rawContent: string,
  castId: ProjectCastId,
  custom?: CustomCastConfig,
): string {
  if (isBuiltinCast(castId)) return transformSoulForCast(rawContent, castId);
  const { data, content } = matter(rawContent);
  const character = typeof data.character === "string" ? data.character : "";
  const valleySlug = resolveValleySlug(character);
  if (!valleySlug) return rawContent;
  const naming = getPersonaNaming(valleySlug, castId, custom);
  const newData: Record<string, unknown> = {
    ...data,
    character: naming.character,
    display_name: naming.display_name,
    aliases: naming.aliases,
  };
  let newContent = content;
  if (content.match(/^#\s+(.+?)\s+—/m)) {
    newContent = content.replace(/^#\s+.+?\s+—/m, `# ${naming.display_name} —`);
  }
  return matter.stringify(newContent, newData);
}

export function transformSkillForProjectCast(
  rawContent: string,
  castId: ProjectCastId,
  custom?: CustomCastConfig,
): string {
  if (isBuiltinCast(castId)) return transformSkillFrontmatterForCast(rawContent, castId);
  const { data, content } = matter(rawContent);
  const originalName = typeof data.name === "string" ? data.name : "";
  const originalDesc = typeof data.description === "string" ? data.description : "";
  if (!originalName) return rawContent;
  const newName = getSkillIdForProjectCast(originalName, castId, custom);
  let newDesc = originalDesc;
  const valleySlug = detectValleySlugFromSkillId(originalName);
  if (valleySlug && originalDesc) {
    const naming = getPersonaNaming(valleySlug, castId, custom);
    const dashIdx = originalDesc.search(/[—\-]/);
    if (dashIdx !== -1) {
      const rest = originalDesc.slice(dashIdx);
      newDesc = `${naming.display_name}${rest.startsWith(" ") ? rest : ` ${rest}`}`;
    }
  }
  if (newName === originalName && newDesc === originalDesc) return rawContent;
  const newData = { ...data, name: newName, description: newDesc };
  return matter.stringify(content, newData);
}

export function getSoulFilenameForProjectCast(
  valleySlug: string,
  castId: ProjectCastId,
  custom?: CustomCastConfig,
): string {
  if (isBuiltinCast(castId)) return getSoulFilenameForCast(valleySlug, castId);
  const naming = getPersonaNaming(valleySlug, castId, custom);
  return `${naming.character}.soul.md`;
}

export async function createCustomCast(repoRoot: string, castId: string, label?: string): Promise<CustomCastConfig> {
  if (isBuiltinCast(castId)) throw new Error(`"${castId}" is a built-in cast — choose another id`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(castId)) {
    throw new Error(`invalid cast id "${castId}" — use lowercase letters, numbers, and hyphens`);
  }
  const dir = PROJECT_CASTS_DIR(repoRoot);
  await ensureDir(dir);
  const config: CustomCastConfig = {
    label: label ?? castId,
    personas: Object.fromEntries(
      Object.entries(CAST_MAP).map(([valleySlug, entry]) => [
        valleySlug,
        { character: valleySlug, display_name: entry.valleyDisplay },
      ]),
    ),
  };
  await writeFile(customCastPath(repoRoot, castId), JSON.stringify(config, null, 2) + "\n", "utf8");
  return config;
}

export async function deleteCustomCast(repoRoot: string, castId: string): Promise<void> {
  if (isBuiltinCast(castId)) throw new Error(`cannot delete built-in cast "${castId}"`);
  const file = customCastPath(repoRoot, castId);
  if (!(await pathExists(file))) throw new Error(`custom cast "${castId}" not found`);
  await remove(file);
}

export function describeProjectCast(castId: ProjectCastId, custom?: CustomCastConfig): string {
  if (isBuiltinCast(castId)) return describeCast(castId);
  return custom?.label ?? castId;
}
