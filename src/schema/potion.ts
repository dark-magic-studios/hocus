import matter from "gray-matter";
import fsExtra from "fs-extra";
const { readFile, readdir, pathExists } = fsExtra;
import path from "node:path";
import { z } from "zod";

export const PotionFrontmatterSchema = z.object({
  potion: z.string().min(1),
  feature: z.string().optional(),
  status: z.enum(["queued", "casting", "blocked", "done"]).default("queued"),
  drafted_by: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).default(0),
});

export type Potion = z.infer<typeof PotionFrontmatterSchema> & { sourcePath: string };

/**
 * Reads every *.md file in a _potions/ directory. Missing or malformed
 * fields fall back to sensible defaults rather than throwing — unlike
 * SOUL.md, a potion file is closer to a living planning doc than a strict
 * contract, so this stays lenient on purpose.
 */
export async function readPotions(potionsDir: string): Promise<Potion[]> {
  if (!(await pathExists(potionsDir))) return [];

  const files = (await readdir(potionsDir)).filter((f) => f.endsWith(".md"));
  const potions: Potion[] = [];

  for (const file of files) {
    const fullPath = path.join(potionsDir, file);
    const raw = await readFile(fullPath, "utf8");
    const { data } = matter(raw);
    const result = PotionFrontmatterSchema.safeParse(data);
    if (result.success) {
      potions.push({ ...result.data, sourcePath: fullPath });
    }
    // Malformed potion files are skipped rather than failing the whole
    // dashboard render — a typo in one plan shouldn't take down the deck.
  }

  return potions;
}
