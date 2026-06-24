import path from "node:path";
import fsExtra from "fs-extra";
const { readdir, writeFile } = fsExtra;
import { log } from "../utils/log.js";
import { PROJECT_PERSONAS_DIR, PROJECT_SPELLS_DIR } from "../utils/paths.js";
import { parseSoulFile } from "../schema/soul.js";
import { readSpells } from "../schema/spell.js";
import { renderDashboard } from "../templates/dashboard.js";

export interface SyncOptions {
  repoRoot: string;
  projectName?: string;
}

export async function runSync({ repoRoot, projectName }: SyncOptions): Promise<void> {
  const name = projectName ?? path.basename(repoRoot);

  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const personaFiles = (await readdir(personasDir).catch(() => [])).filter((f) =>
    f.endsWith(".soul.md")
  );
  const souls = personaFiles.map((f) => parseSoulFile(path.join(personasDir, f)));
  const spells = await readSpells(PROJECT_SPELLS_DIR(repoRoot));

  const html = renderDashboard({ projectName: name, personas: souls, spells });
  await writeFile(path.join(repoRoot, "dashboard.html"), html, "utf8");
  log.ok(`dashboard.html refreshed — ${souls.length} agents, ${spells.length} spells`);
}
