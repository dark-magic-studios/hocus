import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists, readdir, readFile, writeFile, unlink, appendFile, stat } = fsExtra;
import matter from "gray-matter";
import { parseSoulFile, type SoulFile } from "../schema/soul.js";
import {
  PROJECT_PERSONAS_DIR,
  PROJECT_LEDGER_FILE,
  PROJECT_POTIONS_DIR,
  PROJECT_SPELLS_DIR,
} from "./paths.js";
import { detectStack } from "../scanners/detect-stack.js";
import { ALL_COMPILERS, getCompiler } from "../compilers/index.js";
import type { TargetId, DetectedStack } from "../compilers/types.js";
import { renderDashboard } from "../templates/dashboard.js";
import { readPotions } from "../schema/potion.js";
import { readSpells, writeSpellsManifest } from "../schema/spell.js";
import { getHocusStatus } from "./status.js";
import { PERSONA_SKILL_IDS, CAST_MAP } from "./cast.js";

export interface AgentFileMatch {
  id: string; // agent identifier, e.g. "server-dev"
  displayName?: string;
  relPath: string; // e.g. ".claude/agents/server-dev.md"
  fullPath: string;
  provider: TargetId | "persona" | "unknown";
  currentPersona: string;
  isStandalonePersona: boolean; // e.g. .claude/agents/dinesh.md
}

export interface AgentGroup {
  id: string; // e.g. "server-dev"
  displayName: string;
  files: AgentFileMatch[];
  currentPersona: string;
  replacementPersona: string;
}

export interface AbsorbOptions {
  repoRoot: string;
  targetPersona: string;
  assignments: Record<string, string>; // agentId -> replacementPersonaSlug
  dryRun?: boolean;
  removePersona?: boolean;
}

export interface AbsorbResult {
  targetPersona: string;
  migratedAgents: {
    agentId: string;
    replacementPersona: string;
    filesUpdated: string[];
  }[];
  removedPersonaFile?: string;
  familiarsUpdated: string[];
  dashboardRefreshed: boolean;
}

const KNOWN_AGENT_DIRS: { dir: string; provider: TargetId | "persona" }[] = [
  { dir: path.join(".claude", "agents"), provider: "claude-code" },
  { dir: path.join(".agents", "agents"), provider: "antigravity" },
  { dir: path.join(".codex", "agents"), provider: "codex" },
  { dir: path.join(".opencode", "agent"), provider: "opencode" },
  { dir: path.join(".opencode", "agents"), provider: "opencode" },
  { dir: path.join(".cursor", "agents"), provider: "cursor" },
  { dir: path.join(".commandcode", "agents"), provider: "command-code" },
  { dir: path.join(".github", "agents"), provider: "copilot" },
  { dir: path.join(".hocus", "personas"), provider: "persona" },
];

/**
 * Returns all valid personas configured in the project's .hocus/personas/ directory.
 */
export async function findAvailablePersonas(repoRoot: string): Promise<SoulFile[]> {
  const dir = PROJECT_PERSONAS_DIR(repoRoot);
  if (!(await pathExists(dir))) return [];

  const files = (await readdir(dir)).filter((f) => f.endsWith(".soul.md"));
  const souls: SoulFile[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(dir, file);
      const soul = parseSoulFile(fullPath);
      souls.push(soul);
    } catch {
      // Ignore malformed files
    }
  }

  return souls;
}

/**
 * Normalizes persona name or slug to match a known character slug in the project.
 */
export function resolvePersonaSlug(input: string, availablePersonas: SoulFile[]): string | undefined {
  const norm = input.trim().toLowerCase();
  for (const soul of availablePersonas) {
    if (soul.character.toLowerCase() === norm) return soul.character;
    if (soul.display_name.toLowerCase() === norm) return soul.character;
    if (soul.aliases?.valley?.toLowerCase() === norm) return soul.character;
    if (soul.aliases?.occult?.toLowerCase() === norm) return soul.character;
  }
  return undefined;
}

/**
 * Scans all agent directories and discovers all agents that currently use `personaSlug`.
 * Groups results by agent identifier.
 */
export async function findAgentsUsingPersona(
  repoRoot: string,
  personaSlug: string,
): Promise<AgentGroup[]> {
  const normTarget = personaSlug.toLowerCase();
  const matches: AgentFileMatch[] = [];

  for (const { dir: relDir, provider } of KNOWN_AGENT_DIRS) {
    const fullDir = path.join(repoRoot, relDir);
    if (!(await pathExists(fullDir))) continue;

    const entries = await readdir(fullDir).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(fullDir, entry);
      const fileStat = await stat(fullPath).catch(() => null);
      if (!fileStat) continue;

      if (fileStat.isDirectory()) {
        // Handle .agents/agents/<name>/agent.md
        const nestedFile = path.join(fullPath, "agent.md");
        if (await pathExists(nestedFile)) {
          const match = await inspectAgentFile(
            nestedFile,
            path.relative(repoRoot, nestedFile),
            provider,
            normTarget,
            entry,
          );
          if (match) matches.push(match);
        }
        continue;
      }

      if (
        !entry.endsWith(".md") &&
        !entry.endsWith(".toml") &&
        !entry.endsWith(".mdc") &&
        !entry.endsWith(".soul.md")
      ) {
        continue;
      }

      const agentId = entry
        .replace(/\.soul\.md$/, "")
        .replace(/\.agent\.md$/, "")
        .replace(/\.(md|toml|mdc)$/, "");

      const match = await inspectAgentFile(
        fullPath,
        path.relative(repoRoot, fullPath),
        provider,
        normTarget,
        agentId,
      );
      if (match) matches.push(match);
    }
  }

  // Group matches by agent identifier
  const groupsMap = new Map<string, AgentGroup>();
  for (const match of matches) {
    const existing = groupsMap.get(match.id);
    if (existing) {
      existing.files.push(match);
    } else {
      groupsMap.set(match.id, {
        id: match.id,
        displayName: match.displayName || match.id,
        files: [match],
        currentPersona: personaSlug,
        replacementPersona: "",
      });
    }
  }

  return Array.from(groupsMap.values());
}

async function inspectAgentFile(
  fullPath: string,
  relPath: string,
  provider: TargetId | "persona",
  targetSlug: string,
  inferredId: string,
): Promise<AgentFileMatch | null> {
  const ext = path.extname(fullPath);
  const baseName = path.basename(fullPath);
  const isStandalone =
    baseName === `${targetSlug}.md` ||
    baseName === `${targetSlug}.agent.md` ||
    baseName === `${targetSlug}.toml` ||
    baseName === `${targetSlug}.mdc` ||
    baseName === `${targetSlug}.soul.md`;

  if (ext === ".toml") {
    // Codex
    const content = await readFile(fullPath, "utf8").catch(() => "");
    const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m);
    const charMatch = content.match(/^character\s*=\s*["']([^"']+)["']/m);
    const usesTarget =
      (charMatch && charMatch[1]?.toLowerCase() === targetSlug) ||
      (nameMatch && nameMatch[1]?.toLowerCase() === targetSlug) ||
      isStandalone;

    if (usesTarget) {
      return {
        id: inferredId,
        displayName: nameMatch?.[1] || inferredId,
        relPath,
        fullPath,
        provider,
        currentPersona: targetSlug,
        isStandalonePersona: isStandalone,
      };
    }
    return null;
  }

  // Markdown files with YAML frontmatter
  try {
    const raw = await readFile(fullPath, "utf8");
    const { data: fm, content } = matter(raw);

    const fmChar = typeof fm.character === "string" ? fm.character.toLowerCase() : undefined;
    const fmPersona = typeof fm.persona === "string" ? fm.persona.toLowerCase() : undefined;
    const fmParent = typeof fm.parent === "string" ? fm.parent.toLowerCase() : undefined;
    const fmName = typeof fm.name === "string" ? fm.name.toLowerCase() : undefined;

    // Do not match the persona's own definition file as an agent that uses it (it is the source itself)
    if (provider === "persona" && !fmParent) {
      return null;
    }

    const usesTarget =
      fmChar === targetSlug ||
      fmPersona === targetSlug ||
      fmParent === targetSlug ||
      (isStandalone && (fmName === targetSlug || !fmChar)) ||
      content.includes(`represents the **${targetSlug}** persona`);

    if (usesTarget) {
      return {
        id: inferredId,
        displayName: (fm.display_name as string) || (fm.name as string) || inferredId,
        relPath,
        fullPath,
        provider,
        currentPersona: targetSlug,
        isStandalonePersona: isStandalone,
      };
    }
  } catch {
    // File could not be read or parsed
  }

  return null;
}

const PERSONA_TO_SKILLS: Record<string, string[]> = {
  "big-head": ["bighead-dumb-test"],
  dinesh: ["dinesh-pr-feedback", "dinesh-pr-open"],
  erlich: ["erlich-changelog", "erlich-readme", "erlich-update-product"],
  gavin: ["gavin-render-dashboard"],
  gilfoyle: ["gilfoyle-pr-review", "gilfoyle-codebase-review"],
  jared: ["jared-orchestrate"],
  "jian-yang": ["jianyang-smart-test"],
  laurie: ["laurie-fix-conflict", "laurie-resolve-config"],
  "peter-gregory": ["peter-invoke"],
  richard: ["richard-draft-potion"],
  russ: ["russ-token-trim"],
  "project-manager": ["scry-tasks"],
};

/**
 * Replaces the persona in a single agent file with a new persona.
 */
export async function replaceAgentPersonaInFile(
  filePath: string,
  oldSoul: SoulFile,
  newSoul: SoulFile,
  dryRun = false,
): Promise<{ action: "updated" | "removed" | "renamed"; newPath?: string }> {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath);
  const isStandalone =
    baseName === `${oldSoul.character}.md` ||
    baseName === `${oldSoul.character}.agent.md` ||
    baseName === `${oldSoul.character}.toml` ||
    baseName === `${oldSoul.character}.mdc` ||
    baseName === `${oldSoul.character}.soul.md`;

  const dir = path.dirname(filePath);

  // If standalone persona file, e.g. .claude/agents/dinesh.md
  if (isStandalone) {
    const extSuffix = baseName.endsWith(".agent.md")
      ? ".agent.md"
      : baseName.endsWith(".soul.md")
      ? ".soul.md"
      : ext;
    const newFileName = `${newSoul.character}${extSuffix}`;
    const newFullPath = path.join(dir, newFileName);

    if (await pathExists(newFullPath)) {
      // The target persona agent already exists, remove the obsolete one
      if (!dryRun) await unlink(filePath).catch(() => {});
      return { action: "removed" };
    }
    // Rename and compile content
    if (!dryRun) {
      await unlink(filePath).catch(() => {});
      // Compiler will write the new compiled file
    }
    return { action: "renamed", newPath: newFullPath };
  }

  if (ext === ".toml") {
    const raw = await readFile(filePath, "utf8");
    let updated = raw;
    updated = updated.replace(
      new RegExp(`name\\s*=\\s*["']${oldSoul.character}["']`, "g"),
      `name = "${newSoul.character}"`,
    );
    updated = updated.replace(
      new RegExp(`character\\s*=\\s*["']${oldSoul.character}["']`, "g"),
      `character = "${newSoul.character}"`,
    );
    updated = updated.replace(new RegExp(oldSoul.display_name, "g"), newSoul.display_name);
    if (!dryRun) {
      await writeFile(filePath, updated, "utf8");
    }
    return { action: "updated" };
  }

  // Markdown files
  const raw = await readFile(filePath, "utf8");
  const { data: fm, content } = matter(raw);

  if (fm.character) fm.character = newSoul.character;
  if (fm.persona) fm.persona = newSoul.character;
  if (fm.parent && fm.parent.toLowerCase() === oldSoul.character.toLowerCase()) {
    fm.parent = newSoul.character;
  }
  if (fm.display_name && (fm.display_name === oldSoul.display_name || fm.display_name === oldSoul.character)) {
    fm.display_name = newSoul.display_name;
  }
  if (fm.voice) fm.voice = newSoul.voice;
  if (fm.glyph) fm.glyph = newSoul.glyph;
  if (fm.aliases && newSoul.aliases) {
    fm.aliases = newSoul.aliases;
  }

  // Update skills if listed in frontmatter
  if (Array.isArray(fm.skills)) {
    const oldSkills = new Set(PERSONA_TO_SKILLS[oldSoul.character] ?? []);
    const newSkills = PERSONA_TO_SKILLS[newSoul.character] ?? [];
    const retainedSkills = (fm.skills as string[]).filter(
      (s) => !oldSkills.has(s) && !s.startsWith(`${oldSoul.character}-`),
    );
    for (const ns of newSkills) {
      if (!retainedSkills.includes(ns)) {
        retainedSkills.push(ns);
      }
    }
    fm.skills = retainedSkills;
  }

  // Update body text
  let updatedContent = content;

  const oldNames = [
    oldSoul.display_name,
    oldSoul.character,
    oldSoul.aliases?.valley,
    oldSoul.aliases?.occult,
  ].filter((n): n is string => Boolean(n));

  const namePattern = oldNames.map(escapeRegExp).join("|");

  // Replace header: e.g. # Flamel (Dinesh) or # Flamel or # Dinesh
  updatedContent = updatedContent.replace(
    new RegExp(`#\\s*(?:${namePattern})(?:\\s*\\([A-Za-z0-9-_ ]+\\))?`, "gi"),
    `# ${newSoul.display_name} (${newSoul.character})`,
  );

  // In Cursor rules
  updatedContent = updatedContent.replace(
    new RegExp(`represents the \\*\\*(?:${namePattern})\\*\\* persona`, "gi"),
    `represents the **${newSoul.display_name}** persona`,
  );

  if (!dryRun) {
    await writeFile(filePath, matter.stringify(updatedContent, fm), "utf8");
  }

  return { action: "updated" };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Executes persona absorption:
 * 1. Migrates all agents using targetPersona to their assigned replacement personas.
 * 2. Updates familiars that reference targetPersona as parent.
 * 3. Removes the target persona file from .hocus/personas/.
 * 4. Refreshes dashboard.html and records ledger entry.
 */
export async function executeAbsorb({
  repoRoot,
  targetPersona,
  assignments,
  dryRun = false,
  removePersona = true,
}: AbsorbOptions): Promise<AbsorbResult> {
  const availablePersonas = await findAvailablePersonas(repoRoot);
  const oldSoul = availablePersonas.find(
    (s) => s.character.toLowerCase() === targetPersona.toLowerCase(),
  );

  if (!oldSoul) {
    throw new Error(`Persona "${targetPersona}" not found in ${PROJECT_PERSONAS_DIR(repoRoot)}`);
  }

  const agentGroups = await findAgentsUsingPersona(repoRoot, oldSoul.character);
  const migratedAgents: AbsorbResult["migratedAgents"] = [];

  for (const group of agentGroups) {
    const replacementSlug = assignments[group.id];
    if (!replacementSlug) continue;

    const newSoul = availablePersonas.find(
      (s) => s.character.toLowerCase() === replacementSlug.toLowerCase(),
    );
    if (!newSoul) continue;

    const filesUpdated: string[] = [];
    for (const fileMatch of group.files) {
      await replaceAgentPersonaInFile(fileMatch.fullPath, oldSoul, newSoul, dryRun);
      filesUpdated.push(fileMatch.relPath);
    }

    migratedAgents.push({
      agentId: group.id,
      replacementPersona: newSoul.character,
      filesUpdated,
    });
  }

  // Update familiars in .hocus/personas/ whose parent is targetPersona
  const familiarsUpdated: string[] = [];
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  if (await pathExists(personasDir)) {
    const personaFiles = (await readdir(personasDir)).filter((f) => f.endsWith(".soul.md"));
    for (const pFile of personaFiles) {
      if (pFile === `${oldSoul.character}.soul.md`) continue;
      const fullPath = path.join(personasDir, pFile);
      try {
        const raw = await readFile(fullPath, "utf8");
        const { data: fm, content } = matter(raw);
        if (fm.parent && fm.parent.toLowerCase() === oldSoul.character.toLowerCase()) {
          const fallbackReplacement =
            Object.values(assignments)[0] ||
            availablePersonas.find((s) => s.character !== oldSoul.character)?.character;
          if (fallbackReplacement) {
            fm.parent = fallbackReplacement;
            if (!dryRun) {
              await writeFile(fullPath, matter.stringify(content, fm), "utf8");
            }
            familiarsUpdated.push(pFile);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Remove the absorbed persona file from .hocus/personas/
  let removedPersonaFile: string | undefined;
  const targetSoulFile = path.join(personasDir, `${oldSoul.character}.soul.md`);
  if (removePersona && (await pathExists(targetSoulFile))) {
    if (!dryRun) {
      await unlink(targetSoulFile).catch(() => {});
    }
    removedPersonaFile = path.relative(repoRoot, targetSoulFile);
  }

  // Refresh dashboard and record ledger
  let dashboardRefreshed = false;
  if (!dryRun) {
    try {
      const remainingSouls = (await findAvailablePersonas(repoRoot)).filter(
        (s) => s.character !== oldSoul.character,
      );
      const potions = await readPotions(PROJECT_POTIONS_DIR(repoRoot)).catch(() => []);
      const spells = await readSpells(PROJECT_SPELLS_DIR(repoRoot)).catch(() => []);
      const statusInfo = await getHocusStatus(repoRoot);
      const html = renderDashboard({
        projectName: path.basename(repoRoot),
        personas: remainingSouls,
        potions,
        spells,
        skillsCount: statusInfo.skillCount,
        statusInfo,
      });
      await writeFile(path.join(repoRoot, "dashboard.html"), html, "utf8");
      dashboardRefreshed = true;
    } catch {
      // ignore
    }

    // Append ledger entry
    try {
      const ledgerFile = PROJECT_LEDGER_FILE(repoRoot);
      const entry = {
        at: new Date().toISOString(),
        agentId: "hocus",
        event: `absorb persona ${oldSoul.character} -> ${Object.entries(assignments)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ")}`,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      };
      await appendFile(ledgerFile, JSON.stringify(entry) + "\n", "utf8").catch(() => {});
    } catch {
      // ignore
    }
  }

  return {
    targetPersona: oldSoul.character,
    migratedAgents,
    removedPersonaFile,
    familiarsUpdated,
    dashboardRefreshed,
  };
}
