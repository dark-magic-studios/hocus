import path from "node:path";
import matter from "gray-matter";
import fsExtra from "fs-extra";
const { readFile, pathExists, writeFile } = fsExtra;
import fg from "fast-glob";
import { z } from "zod";

export const IncantationFrontmatterSchema = z.object({
  name: z.string().min(1),
  type: z.literal("incantation"),
  description: z.string().optional(),
});

export const WardFrontmatterSchema = z.object({
  name: z.string().min(1),
  type: z.literal("ward"),
  trigger: z.string().min(1),
  calls: z.string().min(1),
  description: z.string().optional(),
});

export const CurseFrontmatterSchema = z.object({
  name: z.string().min(1),
  type: z.literal("curse"),
  severity: z.enum(["hard", "soft"]).default("hard"),
  description: z.string().optional(),
});

export const SpellFrontmatterSchema = z.discriminatedUnion("type", [
  IncantationFrontmatterSchema,
  WardFrontmatterSchema,
  CurseFrontmatterSchema,
]);

export type IncantationFrontmatter = z.infer<typeof IncantationFrontmatterSchema>;
export type WardFrontmatter = z.infer<typeof WardFrontmatterSchema>;
export type CurseFrontmatter = z.infer<typeof CurseFrontmatterSchema>;

export type IncantationSpell = IncantationFrontmatter & {
  sourcePath: string;
  relPath: string;
  body: string;
};

export type WardSpell = WardFrontmatter & {
  sourcePath: string;
  relPath: string;
  body: string;
};

export type CurseSpell = CurseFrontmatter & {
  sourcePath: string;
  relPath: string;
  body: string;
};

export type Spell = IncantationSpell | WardSpell | CurseSpell;

export interface SpellsManifestEntry {
  name: string;
  type: "incantation" | "ward" | "curse";
  file: string;
  description?: string;
  trigger?: string;
  calls?: string;
  severity?: "hard" | "soft";
}

export interface SpellsManifest {
  $schema: string;
  version: string;
  spells: SpellsManifestEntry[];
}

/**
 * Reads all *.md spell files in a _spells/ directory (including incantations/,
 * wards/, and curses/ subdirectories). Lenient parser: malformed files are
 * skipped rather than throwing.
 */
export async function readSpells(spellsDir: string): Promise<Spell[]> {
  if (!(await pathExists(spellsDir))) return [];

  const mdFiles = await fg("**/*.md", {
    cwd: spellsDir,
    onlyFiles: true,
  });

  const spells: Spell[] = [];

  for (const relPath of mdFiles) {
    const fullPath = path.join(spellsDir, relPath);
    try {
      const raw = await readFile(fullPath, "utf8");
      const { data, content } = matter(raw);

      // Infer type from directory if missing from frontmatter
      const dirName = path.dirname(relPath).toLowerCase();
      let inferredType = data.type;
      if (!inferredType) {
        if (dirName.includes("incantation")) inferredType = "incantation";
        else if (dirName.includes("ward")) inferredType = "ward";
        else if (dirName.includes("curse")) inferredType = "curse";
      }

      const mergedData = {
        name: data.name ?? path.basename(relPath, ".md"),
        ...data,
        type: inferredType,
      };

      const result = SpellFrontmatterSchema.safeParse(mergedData);
      if (result.success) {
        spells.push({
          ...result.data,
          sourcePath: fullPath,
          relPath,
          body: content.trim(),
        } as Spell);
      }
    } catch {
      // Malformed spell files are ignored to preserve fault tolerance
    }
  }

  // Sort deterministically: incantations, then wards, then curses, then by name
  const order: Record<string, number> = { incantation: 0, ward: 1, curse: 2 };
  return spells.sort((a, b) => {
    const typeDiff = (order[a.type] ?? 99) - (order[b.type] ?? 99);
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Generates and writes _spells/manifest.json for fast indexing and agent discovery.
 */
export async function writeSpellsManifest(
  spellsDir: string,
  spellsInput?: Spell[],
): Promise<string> {
  const spells = spellsInput ?? (await readSpells(spellsDir));
  const manifestPath = path.join(spellsDir, "manifest.json");

  const entries: SpellsManifestEntry[] = spells.map((s) => {
    const base: SpellsManifestEntry = {
      name: s.name,
      type: s.type,
      file: s.relPath,
    };
    if (s.description) base.description = s.description;
    if (s.type === "ward") {
      base.trigger = s.trigger;
      base.calls = s.calls;
    } else if (s.type === "curse") {
      base.severity = s.severity;
    }
    return base;
  });

  const manifest: SpellsManifest = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    version: "1.0.0",
    spells: entries,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifestPath;
}
