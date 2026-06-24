import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists } = fsExtra;
import { log } from "../utils/log.js";
import { BUNDLED_SKILLS_DIR } from "../utils/paths.js";
import { installSkill } from "../utils/files.js";

export interface SkillAddOptions {
  repoRoot: string;
  name: string;
  from?: string;
}

export async function runSkillAdd({ repoRoot, name, from }: SkillAddOptions): Promise<void> {
  const sourceDir = from ?? path.join(BUNDLED_SKILLS_DIR, name);

  if (!(await pathExists(sourceDir))) {
    log.error(`no skill found at ${sourceDir}`);
    if (!from) {
      log.info("pass --from <path> to install a skill that isn't bundled with aviomancy");
    }
    return;
  }

  const targets = await installSkill(sourceDir, repoRoot, name);
  log.ok(`installed "${name}" to:`);
  for (const target of targets) log.info(target);
}
