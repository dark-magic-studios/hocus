import path from "node:path";
import { log } from "../utils/log.js";
import {
  findAvailableSouls,
  findExistingSubagents,
  resolveSoulSlug,
  executeAffix,
  type DetectedSubagent,
} from "../utils/affix.js";
import { promptAffix } from "../tui/components/AffixPrompt.js";
import { PROJECT_SOULS_DIR, PROJECT_PERSONAS_DIR } from "../utils/paths.js";

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
  const soulsDir = PROJECT_SOULS_DIR(repoRoot);
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const availableSouls = await findAvailableSouls(repoRoot);

  if (!availableSouls.length) {
    log.error(`no souls found in ${soulsDir} or ${personasDir} — could not load or initialize souls`);
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
            ? detectedFiles.map((f) => f.relPath).join(", ")
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
        `soul "${soul}" not found. Available souls: ${availableSouls
          .map((s) => s.character)
          .join(", ")}`,
      );
      return;
    }

    // Affix the resolved soul to all matched target files
    for (const f of targetFiles) {
      assignments[f.relPath] = resolvedSoul;
    }
  } else {
    if (!detectedFiles.length) {
      log.warn("no custom agents or subagents detected in this project.");
      log.info(
        "create a custom agent in .cursor/agents/, .claude/agents/, .agents/agents/, etc. or run `hocus add -a <persona>`",
      );
      return;
    }

    if (interactive) {
      // Pass targetFiles directly: ONE ENTRY PER FILE!
      const prompted = await promptAffix(availableSouls, targetFiles);
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

  log.heading("affixing souls to subagent files...");

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
      log.ok(`affixed soul "${soulDisplay}" to ${item.relPath}`);
    }
    log.ok(`successfully affixed ${result.affixedAgents.length} subagent file(s)!`);
  } else {
    log.info("no files were updated");
  }
}
