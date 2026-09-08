import path from "node:path";
import fsExtra from "fs-extra";
const { readdir } = fsExtra;
import { log } from "../utils/log.js";
import { PROJECT_PERSONAS_DIR, PROJECT_POTIONS_DIR } from "../utils/paths.js";
import { parseSoulFile, type SoulFile } from "../schema/soul.js";
import { ALL_COMPILERS } from "../compilers/index.js";
import type { Compiler, TargetId } from "../compilers/types.js";
import { writeCompiledFile } from "../utils/files.js";
import { detectStack } from "../scanners/detect-stack.js";
import { readPotions } from "../schema/potion.js";
import { renderDashboard } from "../templates/dashboard.js";
import { getHocusStatus } from "../utils/status.js";

export interface CastOptions {
  repoRoot: string;
  projectName?: string;
  targets?: TargetId[];
  dryRun?: boolean;
}

export async function runCast({ repoRoot, projectName, targets, dryRun = false }: CastOptions): Promise<void> {
  const name = projectName ?? path.basename(repoRoot);
  log.heading(`casting in ${repoRoot}`);
  if (dryRun) {
    log.info("dry run — no files will be written");
  }

  const stack = await detectStack(repoRoot);
  const stackSummary = [...stack.languages, ...stack.frameworks];
  if (stackSummary.length) {
    log.info(`detected: ${stackSummary.join(", ")}`);
  } else {
    log.warn("couldn't detect a stack from this repo — compiling without repo-specific context");
  }

  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const personaFiles = (await readdir(personasDir).catch(() => [])).filter((f) =>
    f.endsWith(".soul.md")
  );
  if (!personaFiles.length) {
    log.error("no personas found in .hocus/personas/ — run `hocus init` first");
    return;
  }
  const souls = personaFiles.map((f) => parseSoulFile(path.join(personasDir, f)));

  // This is what makes `cast` different from the generic output `init`
  // produces: every compiled persona carries real context about the repo
  // it's actually being installed into.
  const tailoredSouls = stackSummary.length ? souls.map((s) => tailor(s, stack)) : souls;

  const compilers = targets?.length
    ? ALL_COMPILERS.filter((c) => targets.includes(c.id))
    : await detectRelevantCompilers(repoRoot);

  if (!compilers.length) {
    log.warn(
      "no target tools detected and none specified — nothing compiled. " +
        "Pass --targets claude-code,codex,opencode,cursor,antigravity,command-code,copilot to force it."
    );
  }

  for (const compiler of compilers) {
    if (dryRun) {
      log.info(`compiler: ${compiler.label}`);
    }
    for (const soul of tailoredSouls) {
      const compiled = compiler.compile(soul, { repoRoot, stack });
      await writeCompiledFile(repoRoot, compiled, { dryRun, target: compiler.label });
    }
    log.ok(`${compiler.label}: compiled ${tailoredSouls.length} agents`);
  }

  // the dashboard always gets refreshed, regardless of which compilers ran
  const potions = await readPotions(PROJECT_POTIONS_DIR(repoRoot));
  const statusInfo = await getHocusStatus(repoRoot);
  const html = renderDashboard({ projectName: name, personas: souls, potions, skillsCount: statusInfo.skillCount, statusInfo });
  await writeCompiledFile(repoRoot, { relPath: "dashboard.html", content: html }, { dryRun });
  log.ok("refreshed dashboard.html");
}

function tailor(soul: SoulFile, stack: Awaited<ReturnType<typeof detectStack>>): SoulFile {
  const parts = [...stack.languages, ...stack.frameworks].join(", ");
  const pm = stack.packageManager ? ` · package manager: ${stack.packageManager}` : "";
  return {
    ...soul,
    body: `${soul.body}\n\n---\n**Repo context:** ${parts}${pm}\n`,
  };
}

async function detectRelevantCompilers(repoRoot: string): Promise<Compiler[]> {
  const checks = await Promise.all(
    ALL_COMPILERS.map(async (c) => ((await c.detect(repoRoot)) ? c : null))
  );
  return checks.filter((c): c is Compiler => c !== null);
}
