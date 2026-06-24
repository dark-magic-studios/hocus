import matter from "gray-matter";
import fsExtra from "fs-extra";
const { readFile, readdir, pathExists } = fsExtra;
import path from "node:path";
import { z } from "zod";

export const SpellFrontmatterSchema = z.object({
  spell: z.string().min(1),
  feature: z.string().optional(),
  status: z.enum(["queued", "casting", "blocked", "done"]).default("queued"),
  drafted_by: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).default(0),
});

export type Spell = z.infer<typeof SpellFrontmatterSchema> & { sourcePath: string };

/**
 * Reads every *.md file in a _spells/ directory. Missing or malformed
 * fields fall back to sensible defaults rather than throwing — unlike
 * SOUL.md, a spell file is closer to a living planning doc than a strict
 * contract, so this stays lenient on purpose.
 */
export async function readSpells(spellsDir: string): Promise<Spell[]> {
  if (!(await pathExists(spellsDir))) return [];

  const files = (await readdir(spellsDir)).filter((f) => f.endsWith(".md"));
  const spells: Spell[] = [];

  for (const file of files) {
    const fullPath = path.join(spellsDir, file);
    const raw = await readFile(fullPath, "utf8");
    const { data } = matter(raw);
    const result = SpellFrontmatterSchema.safeParse(data);
    if (result.success) {
      spells.push({ ...result.data, sourcePath: fullPath });
    }
    // Malformed spell files are skipped rather than failing the whole
    // dashboard render — a typo in one plan shouldn't take down the deck.
  }

  return spells;
}
