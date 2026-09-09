import path from "node:path";
import { log } from "../utils/log.js";
import {
  findAvailableSouls,
  findExistingSubagents,
  groupSubagents,
  resolveSoulSlug,
  executeAffix,
  type DetectedSubagent,
} from "../utils/affix.js";
import { promptAffix } from "../tui/components/AffixPrompt.js";
import { PROJECT_PERSONAS_DIR } from "../utils/paths.js";

export interface AffixCommandOptions {
  repoRoot: string;
  agent?: string;
  soul?: string;
  dryRun?: boolean;
  interactive?: boolean;
}

export async function runAffix({
  repoRoot,
  agent,
  soul,
  dryRun = false,
  interactive = true,
}: AffixCommandOptions): Promise<void> {
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const availableSouls = await findAvailableSouls(repoRoot);

  if (!availableSouls.length) {
    log.error(`no personas found in ${personasDir} — could not load or initialize souls`);
    return;
  }

  const detectedFiles = await findExistingSubagents(repoRoot);

  let targetFiles: DetectedSubagent[] = detectedFiles;

  // If user passed a specific agent via flag or argument
  if (agent) {
    const norm = agent.trim().toLowerCase();
    const matched = detectedFiles.filter(
      (f) =>
        f.id.toLowerCase() === norm ||
        f.relPath.toLowerCase() === norm ||
        f.filePath.toLowerCase() === norm ||
        path.basename(f.filePath, path.extname(f.filePath)).toLowerCase() === norm,
    );

    if (!matched.length) {
      log.error(
        `agent "${agent}" not found in project. Detected agents: ${
          detectedFiles.length
            ? detectedFiles.map((f) => f.id).join(", ")
            : "none"
        }`,
      );
      return;
    }
    targetFiles = matched;
  }

  let assignments: Record<string, string> = {};

  if (soul) {
    const resolvedSoul = resolveSoulSlug(soul, availableSouls);
    if (!resolvedSoul) {
      log.error(
        `soul "${soul}" not found in ${personasDir}. Available souls: ${availableSouls
          .map((s) => s.character)
          .join(", ")}`,
      );
      return;
    }

    // Affix the resolved soul to all matched target files
    const targetGroups = groupSubagents(targetFiles);
    for (const g of targetGroups) {
      assignments[g.id] = resolvedSoul;
    }
  } else {
    if (!detectedFiles.length) {
      log.warn("no custom agents or subagents detected in this project.");
      log.info(
        "create a custom agent in .cursor/agents/, .claude/agents/, .agents/agents/, etc. or run `hocus add -a <persona>`",
      );
      return;
    }

    const groups = groupSubagents(targetFiles);

    if (interactive) {
      const prompted = await promptAffix(availableSouls, groups);
      if (!prompted) {
        log.info("affix cancelled — no changes made");
        return;
      }
      assignments = prompted;
    } else {
      // Non-interactive without soul flag: skip
      log.info("non-interactive mode without --soul specified — nothing to affix");
      return;
    }
  }

  const assignedCount = Object.values(assignments).filter((s) => s && s !== "none").length;
  if (assignedCount === 0) {
    log.info("no souls selected to affix — exiting");
    return;
  }

  if (dryRun) {
    log.info("dry run — no files will be modified");
  }

  log.heading("affixing souls to subagents...");

  const result = await executeAffix({
    repoRoot,
    assignments,
    availableSouls,
    subagentFiles: targetFiles,
    dryRun,
  });

  if (result.affixedAgents.length > 0) {
    for (const item of result.affixedAgents) {
      const soulObj = availableSouls.find((s) => s.character === item.soul);
      const soulDisplay = soulObj ? `${soulObj.display_name} (${item.soul})` : item.soul;
      log.ok(
        `affixed soul "${soulDisplay}" to "${item.agentId}" → ${item.filesUpdated.join(", ")}`,
      );
    }
    log.ok(`successfully affixed ${result.affixedAgents.length} subagent(s)!`);
  } else {
    log.info("no files were updated");
  }
}
