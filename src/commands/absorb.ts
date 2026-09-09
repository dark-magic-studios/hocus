import path from "node:path";
import { log } from "../utils/log.js";
import {
  findAvailablePersonas,
  findAgentsUsingPersona,
  resolvePersonaSlug,
  executeAbsorb,
} from "../utils/absorb.js";
import { promptAbsorb } from "../tui/components/AbsorbPrompt.js";
import { PROJECT_PERSONAS_DIR } from "../utils/paths.js";

export interface AbsorbCommandOptions {
  repoRoot: string;
  persona?: string;
  into?: string;
  dryRun?: boolean;
  remove?: boolean;
}

export async function runAbsorb({
  repoRoot,
  persona,
  into,
  dryRun = false,
  remove = true,
}: AbsorbCommandOptions): Promise<void> {
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  const allPersonas = await findAvailablePersonas(repoRoot);

  if (!allPersonas.length) {
    log.error(`no personas found in ${personasDir} — run \`hocus init\` first`);
    return;
  }

  let targetSlug: string | undefined;

  if (persona) {
    targetSlug = resolvePersonaSlug(persona, allPersonas);
    if (!targetSlug) {
      log.error(
        `persona "${persona}" not found. Available personas: ${allPersonas
          .map((p) => p.character)
          .join(", ")}`,
      );
      return;
    }
  } else {
    // If no persona given, list personas and pick the first or prompt
    log.warn(
      `no persona specified to absorb. Available: ${allPersonas
        .map((p) => p.character)
        .join(", ")}`,
    );
    log.info(`usage: hocus absorb <persona> [--into <replacement>]`);
    return;
  }

  const targetSoul = allPersonas.find((p) => p.character === targetSlug)!;
  const replacementCandidates = allPersonas.filter((p) => p.character !== targetSlug);

  if (!replacementCandidates.length) {
    log.error(
      `cannot absorb "${targetSlug}" — no other personas exist in ${personasDir} to absorb into.`,
    );
    return;
  }

  const agentGroups = await findAgentsUsingPersona(repoRoot, targetSlug);

  let assignments: Record<string, string> = {};

  if (into) {
    const resolvedInto = resolvePersonaSlug(into, replacementCandidates);
    if (!resolvedInto) {
      log.error(
        `replacement persona "${into}" not found. Available: ${replacementCandidates
          .map((p) => p.character)
          .join(", ")}`,
      );
      return;
    }
    for (const ag of agentGroups) {
      assignments[ag.id] = resolvedInto;
    }
  } else {
    // Interactive TUI selection
    const prompted = await promptAbsorb(targetSoul, replacementCandidates, agentGroups);
    if (!prompted) {
      log.info("absorption cancelled — no changes made");
      return;
    }
    assignments = prompted;
  }

  if (dryRun) {
    log.info("dry run — no files will be modified");
  }

  log.heading(`absorbing persona "${targetSoul.display_name}" (${targetSlug})...`);

  const result = await executeAbsorb({
    repoRoot,
    targetPersona: targetSlug,
    assignments,
    dryRun,
    removePersona: remove,
  });

  if (result.migratedAgents.length > 0) {
    for (const m of result.migratedAgents) {
      log.ok(`migrated agent "${m.agentId}" → persona "${m.replacementPersona}" (${m.filesUpdated.length} file(s))`);
    }
  } else {
    log.info("no dependent agents needed migration");
  }

  if (result.familiarsUpdated.length > 0) {
    log.ok(`updated ${result.familiarsUpdated.length} familiar(s) in .hocus/personas/`);
  }

  if (result.removedPersonaFile) {
    log.ok(`removed persona file: ${result.removedPersonaFile}`);
  }

  if (result.dashboardRefreshed) {
    log.ok("refreshed dashboard.html");
  }

  log.ok(`absorbed persona "${targetSlug}" successfully!`);
}
