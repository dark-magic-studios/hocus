import path from "node:path";
import { spawnSync } from "node:child_process";
import fsExtra from "fs-extra";
const { ensureDir, pathExists, readdir, readFile, writeFile } = fsExtra;
import { log } from "../utils/log.js";
import { BUNDLED_PERSONAS_DIR, PROJECT_PERSONAS_DIR } from "../utils/paths.js";
import { parseSoulFile } from "../schema/soul.js";

export interface InitOptions {
  repoRoot: string;
  projectName?: string;
}

const FOUNDER_SOUL = "peter-gregory";

const INIT_PROMPT =
  "scan the repository for its dependencies and tech stack. create a team of 5-10 agents and skills and ask the user to accept/tweak each of them. each of them should have a soul based on a soul from this repository which will dictate the tone and output of the agent. also include specialized skills for this repository (for example a new-component or new-hook for frontend and new-controller or new-model for backend). create a aviomancy.md with the agents to be created, mark them as done once you've stopped working on them and after all are done build the initial dashboard.html for this the project. also set up the project's foundational documents: PRODUCT.md (product vision, goals, target users), CLAUDE.md (project-specific instructions for Claude Code), AGENTS.md (registry of all created agents), MEMORY.md (persistent memory index), and TASKS.md (current work items). fill each with real content derived from the repository — not placeholder text.";

export async function runInit({ repoRoot }: InitOptions): Promise<void> {
  log.heading(`initializing aviomancy in ${repoRoot}`);

  // 1. Copy bundled personas into the project so the founder soul can
  //    reference them when proposing the tailored cast.
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  await ensureDir(personasDir);
  const personaFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
  let installedCount = 0;
  for (const file of personaFiles) {
    const dest = path.join(personasDir, file);
    if (await pathExists(dest)) continue;
    const content = await readFile(path.join(BUNDLED_PERSONAS_DIR, file), "utf8");
    await writeFile(dest, content, "utf8");
    installedCount++;
  }
  log.ok(`installed ${installedCount} personas to .aviomancy/personas/`);

  // 2. Parse the founder soul and fire an interactive claude session with
  //    its body as the system prompt and the standard init task as the
  //    first user message.
  const founderPath = path.join(BUNDLED_PERSONAS_DIR, `${FOUNDER_SOUL}.soul.md`);
  const founder = parseSoulFile(founderPath);

  log.ok(`firing ${founder.display_name} — ${founder.role}`);

  const result = spawnSync("claude", ["--system-prompt", founder.body, INIT_PROMPT], {
    stdio: "inherit",
    cwd: repoRoot,
  });

  if (result.error) {
    throw new Error(`failed to spawn claude: ${result.error.message}`);
  }
}
