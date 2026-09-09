import path from "node:path";
import matter from "gray-matter";
import fsExtra from "fs-extra";
const { pathExists, readdir, readFile, stat } = fsExtra;
import { parseSoulFile, SoulValidationError } from "../../schema/soul.js";
import { readPotions } from "../../schema/potion.js";
import { detectStack } from "../../scanners/detect-stack.js";
import { ALL_COMPILERS } from "../../compilers/index.js";
import { OPENCODE_AGENT_DIR } from "../../compilers/opencode.js";
import {
  BUNDLED_SKILLS_DIR,
  PROJECT_LEDGER_FILE,
  PROJECT_PERSONAS_DIR,
  PROJECT_SKILLS_DIR,
  PROJECT_POTIONS_DIR,
  PROJECT_SPELLS_DIR,
} from "../../utils/paths.js";
import { readSpells } from "../../schema/spell.js";
import type { Agent, DeckData, LedgerEntry, Skill, Potion, SpellItem, Tier, Ward } from "./types.js";

const LEDGER_TAIL = 200;

const WARD_AGENT_DIR: Record<string, string> = {
  "claude-code": path.join(".claude", "agents"),
  codex: path.join(".codex", "agents"),
  opencode: path.join(".opencode", OPENCODE_AGENT_DIR),
  cursor: path.join(".cursor", "rules"),
  antigravity: path.join(".agents", "agents"),
  "command-code": path.join(".commandcode", "agents"),
  copilot: path.join(".github", "agents"),
};

import { getHocusStatus } from "../../utils/status.js";
import { buildSkillSyncMap, resolveBundledSkillId, detectProjectCast } from "../../utils/skill-audit.js";
import { listAvailableCasts, loadCustomCast, describeProjectCast, isBuiltinCast } from "../../utils/cast-registry.js";
import type { SkillSyncStatus } from "./types.js";

/**
 * Reads the on-disk state the TUI renders. Never throws — a malformed file
 * anywhere downgrades to a warning row instead of taking the whole deck
 * down, since the deck is read-only and the source files are still there
 * to fix by hand.
 */
export async function loadDeck(cwd: string): Promise<DeckData> {
  const warnings: string[] = [];

  const [agents, potions, spells, rawSkills, wards, ledger, status, syncMap, cast, availableCasts] = await Promise.all([
    loadAgents(cwd, warnings),
    loadPotions(cwd, warnings),
    loadSpells(cwd, warnings),
    loadSkills(cwd, warnings),
    loadWards(cwd),
    loadLedger(cwd, warnings),
    getHocusStatus(cwd),
    buildSkillSyncMap(cwd),
    detectProjectCast(cwd),
    listAvailableCasts(cwd),
  ]);

  const custom = isBuiltinCast(cast) ? undefined : await loadCustomCast(cwd, cast);
  const castLabel = describeProjectCast(cast, custom);

  const skills = await Promise.all(
    rawSkills.map(async (skill) => {
      const bundledId =
        skill.source === "bundled"
          ? skill.id
          : await resolveBundledSkillId(cwd, skill.id, cast);
      let syncStatus: SkillSyncStatus =
        syncMap.get(skill.id) ??
        (skill.source === "bundled" ? "available" : "local");
      if (skill.source === "bundled" && syncStatus === "current") {
        syncStatus = "available";
      }
      return { ...skill, syncStatus, bundledId };
    }),
  );

  return { agents, potions, spells, skills, wards, ledger, status, warnings, cast, castLabel, availableCasts };
}

async function loadAgents(cwd: string, warnings: string[]): Promise<Agent[]> {
  const dir = PROJECT_PERSONAS_DIR(cwd);
  if (!(await pathExists(dir))) return [];

  const files = (await readdir(dir)).filter((f) => f.endsWith(".soul.md"));
  const agents: Agent[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const soul = parseSoulFile(fullPath);
      const tier: Tier = soul.tier ?? (soul.parent ? "familiar" : "circle");
      agents.push({
        id: soul.character,
        name: soul.display_name,
        role: soul.role,
        tier,
        status: "idle",
        glyph: soul.glyph,
        parentId: soul.parent,
        scope: soul.scope,
        soulPath: fullPath,
        aliases: soul.aliases,
      });
    } catch (e) {
      const message = e instanceof SoulValidationError ? e.message : String(e);
      warnings.push(`malformed SOUL.md: ${path.relative(cwd, fullPath)} — ${message}`);
    }
  }

  const byId = new Map(agents.map((a) => [a.id, a] as const));

  for (const agent of agents) {
    if (!agent.parentId) continue;

    if (!byId.has(agent.parentId)) {
      warnings.push(`orphaned agent: ${agent.name} — parent "${agent.parentId}" not found`);
      continue;
    }

    if (hasCycle(agent, byId)) {
      warnings.push(`circular parent reference detected at ${agent.name} (${agent.id}) — treating as root`);
      agent.parentId = undefined;
      agent.tier = "circle";
    }
  }

  return agents;
}

function hasCycle(start: Agent, byId: Map<string, Agent>): boolean {
  const seen = new Set<string>([start.id]);
  let current = start;
  while (current.parentId) {
    if (seen.has(current.parentId)) return true;
    seen.add(current.parentId);
    const next = byId.get(current.parentId);
    if (!next) return false;
    current = next;
  }
  return false;
}

async function loadPotions(cwd: string, warnings: string[]): Promise<Potion[]> {
  const dir = PROJECT_POTIONS_DIR(cwd);
  if (!(await pathExists(dir))) return [];

  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  const parsed = await readPotions(dir);
  const parsedPaths = new Set(parsed.map((s) => s.sourcePath));

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!parsedPaths.has(fullPath)) {
      warnings.push(`malformed potion file: ${path.relative(cwd, fullPath)} — skipped`);
    }
  }

  return parsed.map((s) => ({
    id: path.basename(s.sourcePath, ".md"),
    name: s.feature ?? s.potion,
    aka: s.potion,
    status: s.status === "done" ? "sealed" : s.status,
    progress: Math.round(s.progress),
    draftedBy: s.drafted_by ?? "unknown",
    assignedTo: s.assigned_to ?? undefined,
    path: s.sourcePath,
  }));
}

async function loadSpells(cwd: string, warnings: string[]): Promise<SpellItem[]> {
  const dir = PROJECT_SPELLS_DIR(cwd);
  if (!(await pathExists(dir))) return [];

  const parsed = await readSpells(dir);
  return parsed.map((s) => ({
    id: s.name,
    name: s.name,
    type: s.type,
    description: s.description,
    trigger: s.type === "ward" ? s.trigger : undefined,
    calls: s.type === "ward" ? s.calls : undefined,
    severity: s.type === "curse" ? s.severity : undefined,
    body: s.body,
    path: s.sourcePath,
    relPath: s.relPath,
  }));
}

async function loadSkills(cwd: string, warnings: string[]): Promise<Skill[]> {
  const skills: Skill[] = [];
  const seen = new Set<string>();

  const installedDir = PROJECT_SKILLS_DIR(cwd);
  await collectSkills(installedDir, "local", skills, seen, warnings, cwd);

  const pluginsDir = path.join(cwd, ".agents", "plugins");
  if (await pathExists(pluginsDir)) {
    const plugins = (await readdir(pluginsDir).catch(() => [] as string[])).filter((f) => !f.startsWith("."));
    for (const plugin of plugins) {
      const pSkillsDir = path.join(pluginsDir, plugin, "skills");
      await collectSkills(pSkillsDir, "local", skills, seen, warnings, cwd);
    }
  }

  const legacyClaudeSkills = path.join(cwd, ".claude", "skills");
  if (await pathExists(legacyClaudeSkills)) {
    await collectSkills(legacyClaudeSkills, "local", skills, seen, warnings, cwd);
  }

  const commandCodeSkills = path.join(cwd, ".commandcode", "skills");
  if (await pathExists(commandCodeSkills)) {
    await collectSkills(commandCodeSkills, "local", skills, seen, warnings, cwd);
  }

  const githubSkills = path.join(cwd, ".github", "skills");
  if (await pathExists(githubSkills)) {
    await collectSkills(githubSkills, "local", skills, seen, warnings, cwd);
  }

  await collectSkills(BUNDLED_SKILLS_DIR, "bundled", skills, seen, warnings, cwd);

  return skills;
}

async function collectSkills(
  dir: string,
  source: Skill["source"],
  out: Skill[],
  seen: Set<string>,
  warnings: string[],
  cwd: string,
): Promise<void> {
  if (!(await pathExists(dir))) return;

  const entries = await readdir(dir);
  for (const name of entries) {
    if (seen.has(name)) continue;
    if (name.startsWith(".") || name === "example-skill") continue;

    const dirPath = path.join(dir, name);
    const s = await stat(dirPath).catch(() => undefined);
    if (!s?.isDirectory()) continue;

    const skillFile = path.join(dirPath, "SKILL.md");
    if (!(await pathExists(skillFile))) continue;

    try {
      const raw = await readFile(skillFile, "utf8");
      const { data } = matter(raw);
      const skillName = typeof data.name === "string" && data.name.length > 0 ? data.name : name;
      const description = typeof data.description === "string" ? data.description : "";
      if (!description) {
        warnings.push(`skill missing description: ${path.relative(cwd, skillFile)}`);
      }
      seen.add(name);
      out.push({
        id: name,
        name: skillName,
        source,
        enabledFor: [],
        description,
        path: skillFile,
        syncStatus: source === "bundled" ? "available" : "local",
      });
    } catch (e) {
      warnings.push(`malformed SKILL.md: ${path.relative(cwd, skillFile)} — ${String(e)}`);
    }
  }
}

async function loadWards(cwd: string): Promise<Ward[]> {
  await detectStack(cwd);

  return Promise.all(
    ALL_COMPILERS.map(async (compiler): Promise<Ward> => {
      const detected = await compiler.detect(cwd);
      const agentDir = WARD_AGENT_DIR[compiler.id];
      let note: string | undefined;

      if (detected && agentDir) {
        const fullDir = path.join(cwd, agentDir);
        let count = 0;
        if (compiler.id === "antigravity") {
          const subdirs = await readdir(fullDir).catch(() => [] as string[]);
          const counts = await Promise.all(
            subdirs.map(async (subdir) =>
              (await pathExists(path.join(fullDir, subdir, "agent.md"))) ? 1 : 0
            )
          );
          count = counts.reduce<number>((a, b) => a + b, 0);
        } else {
          count = (await readdir(fullDir).catch(() => [] as string[])).filter(
            (f) => f.endsWith(".md") || f.endsWith(".mdc"),
          ).length;
        }
        note = `${count} compiled`;
      }

      return { target: compiler.id, detected, agentDir, note };
    }),
  );
}

async function loadLedger(cwd: string, warnings: string[]): Promise<LedgerEntry[]> {
  const file = PROJECT_LEDGER_FILE(cwd);
  if (!(await pathExists(file))) return [];

  const raw = await readFile(file, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const tail = lines.slice(-LEDGER_TAIL);

  const entries: LedgerEntry[] = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line) as Partial<LedgerEntry>;
      if (
        typeof parsed.at !== "string" ||
        typeof parsed.agentId !== "string" ||
        typeof parsed.event !== "string" ||
        typeof parsed.tokensIn !== "number" ||
        typeof parsed.tokensOut !== "number" ||
        typeof parsed.costUsd !== "number"
      ) {
        throw new Error("missing or mistyped field");
      }
      entries.push({
        at: parsed.at,
        agentId: parsed.agentId,
        event: parsed.event,
        tokensIn: Math.round(parsed.tokensIn),
        tokensOut: Math.round(parsed.tokensOut),
        costUsd: Math.round(parsed.costUsd * 10000) / 10000,
      });
    } catch (e) {
      warnings.push(`malformed ledger line in ${path.relative(cwd, file)}: ${String(e)}`);
    }
  }

  return entries;
}
