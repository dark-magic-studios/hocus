import path from "node:path";
import { spawnSync } from "node:child_process";
import fsExtra from "fs-extra";
const { ensureDir, pathExists, readdir, readFile, writeFile, stat } = fsExtra;
import { log } from "../utils/log.js";
import { BUNDLED_PERSONAS_DIR, BUNDLED_SKILLS_DIR, PROJECT_PERSONAS_DIR } from "../utils/paths.js";
import { parseSoulFile } from "../schema/soul.js";
import { installSkill } from "../utils/files.js";

export interface InitOptions {
  repoRoot: string;
  projectName?: string;
  dryRun?: boolean;
}

const FOUNDER_SOUL = "peter-gregory";

const INIT_PROMPT =
  "scan the repository for its dependencies and tech stack. create a team of 5-10 agents and skills and ask the user to accept/tweak each of them. each of them should have a soul based on a soul from this repository which will dictate the tone and output of the agent. also include specialized skills for this repository (for example a new-component or new-hook for frontend and new-controller or new-model for backend). the team must include an orchestrator agent whose job is to (1) maintain battle plans — structured markdown files that break down active goals into phases, tasks, and owners — and keep them up to date as work progresses, and (2) read the planner's task queue and delegate individual tasks to the appropriate specialized sub-agents by spawning them with the right context. create a hocus.md with the agents to be created, mark them as done once you've stopped working on them and after all are done build the initial dashboard.html for this the project. also set up the project's foundational documents: PRODUCT.md (product vision, goals, target users), CLAUDE.md (project-specific instructions for Claude Code), AGENTS.md (registry of all created agents), MEMORY.md (persistent memory index), and TASKS.md (current work items). fill each with real content derived from the repository — not placeholder text. skills have been pre-installed in .agents/skills/ and .claude/skills/ — reference them when creating agents, and create additional project-specific skills as needed.";

export async function runInit({ repoRoot, dryRun = false }: InitOptions): Promise<void> {
  log.heading(`initializing hocus in ${repoRoot}`);
  if (dryRun) {
    log.info("dry run — no files will be written");
  }

  // 1. Copy bundled personas into the project so the founder soul can
  //    reference them when proposing the tailored cast.
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  if (!dryRun) {
    await ensureDir(personasDir);
  }
  const personaFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
  let installedCount = 0;
  for (const file of personaFiles) {
    const dest = path.join(personasDir, file);
    if (await pathExists(dest)) continue;
    if (dryRun) {
      log.planned(path.relative(repoRoot, dest));
    } else {
      const content = await readFile(path.join(BUNDLED_PERSONAS_DIR, file), "utf8");
      await writeFile(dest, content, "utf8");
    }
    installedCount++;
  }
  log.ok(`installed ${installedCount} personas to .hocus/personas/`);

  // 1b. Install all bundled skills into the target project
  const skillDirs = (await readdir(BUNDLED_SKILLS_DIR)).filter(
    (f) => !f.startsWith(".") && f !== "example-skill",
  );
  let skillCount = 0;
  for (const skill of skillDirs) {
    const src = path.join(BUNDLED_SKILLS_DIR, skill);
    const s = await stat(src);
    if (!s.isDirectory()) continue;
    await installSkill(src, repoRoot, skill, { dryRun });
    skillCount++;
  }
  log.ok(`installed ${skillCount} skills to .agents/skills/ and .claude/skills/`);

  // 2. Parse the founder soul and fire an interactive claude session with
  //    its body as the system prompt and the standard init task as the
  //    first user message.
  const founderPath = path.join(BUNDLED_PERSONAS_DIR, `${FOUNDER_SOUL}.soul.md`);
  const founder = parseSoulFile(founderPath);

  log.ok(`firing ${founder.display_name} — ${founder.role}`);

  if (dryRun) {
    log.info("would spawn claude — interactive session creates project docs and dashboard.html");
    return;
  }

  const result = spawnSync("claude", ["--system-prompt", founder.body, INIT_PROMPT], {
    stdio: "inherit",
    cwd: repoRoot,
  });

  if (result.error) {
    throw new Error(`failed to spawn claude: ${result.error.message}`);
  }
}
