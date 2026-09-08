import path from "node:path";
import fsExtra from "fs-extra";
const { readdir, writeFile } = fsExtra;
import { log } from "../utils/log.js";
import { PROJECT_PERSONAS_DIR, PROJECT_POTIONS_DIR } from "../utils/paths.js";
import { parseSoulFile } from "../schema/soul.js";
import { readPotions } from "../schema/potion.js";
import { renderDashboard } from "../templates/dashboard.js";
import { getHocusStatus } from "../utils/status.js";

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
  const potions = await readPotions(PROJECT_POTIONS_DIR(repoRoot));
  const statusInfo = await getHocusStatus(repoRoot);

  const html = renderDashboard({ projectName: name, personas: souls, potions, skillsCount: statusInfo.skillCount, statusInfo });
  await writeFile(path.join(repoRoot, "dashboard.html"), html, "utf8");
  log.ok(`dashboard.html refreshed — ${souls.length} agents, ${statusInfo.skillCount} skills, ${potions.length} potions`);
}
