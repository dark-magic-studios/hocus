import path from "node:path";
import matter from "gray-matter";
import fsExtra from "fs-extra";
const { pathExists, readdir, readFile, stat } = fsExtra;
import { parseSoulFile, SoulValidationError } from "../../schema/soul.js";
import { readSpells } from "../../schema/spell.js";
import { detectStack } from "../../scanners/detect-stack.js";
import { ALL_COMPILERS } from "../../compilers/index.js";
import { OPENCODE_AGENT_DIR } from "../../compilers/opencode.js";
import {
  BUNDLED_SKILLS_DIR,
  PROJECT_LEDGER_FILE,
  PROJECT_PERSONAS_DIR,
  PROJECT_SKILLS_DIR,
  PROJECT_SPELLS_DIR,
} from "../../utils/paths.js";
import type { Agent, DeckData, LedgerEntry, Skill, Spell, Tier, Ward } from "./types.js";

const LEDGER_TAIL = 200;

const WARD_AGENT_DIR: Record<string, string> = {
  "claude-code": path.join(".claude", "agents"),
  opencode: path.join(".opencode", OPENCODE_AGENT_DIR),
  cursor: path.join(".cursor", "rules"),
  antigravity: path.join(".agents", "rules"),
};

/**
 * Reads the on-disk state the TUI renders. Never throws — a malformed file
 * anywhere downgrades to a warning row instead of taking the whole deck
 * down, since the deck is read-only and the source files are still there
 * to fix by hand.
 */
export async function loadDeck(cwd: string): Promise<DeckData> {
  const warnings: string[] = [];

  const [agents, spells, skills, wards, ledger] = await Promise.all([
    loadAgents(cwd, warnings),
    loadSpells(cwd, warnings),
    loadSkills(cwd, warnings),
    loadWards(cwd),
    loadLedger(cwd, warnings),
  ]);

  return { agents, spells, skills, wards, ledger, warnings };
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

async function loadSpells(cwd: string, warnings: string[]): Promise<Spell[]> {
  const dir = PROJECT_SPELLS_DIR(cwd);
  if (!(await pathExists(dir))) return [];

  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  const parsed = await readSpells(dir);
  const parsedPaths = new Set(parsed.map((s) => s.sourcePath));

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!parsedPaths.has(fullPath)) {
      warnings.push(`malformed spell file: ${path.relative(cwd, fullPath)} — skipped`);
    }
  }

  return parsed.map((s) => ({
    id: path.basename(s.sourcePath, ".md"),
    name: s.feature ?? s.spell,
    aka: s.spell,
    status: s.status === "done" ? "sealed" : s.status,
    progress: Math.round(s.progress),
    draftedBy: s.drafted_by ?? "unknown",
    assignedTo: s.assigned_to ?? undefined,
    path: s.sourcePath,
  }));
}

async function loadSkills(cwd: string, warnings: string[]): Promise<Skill[]> {
  const skills: Skill[] = [];
  const seen = new Set<string>();

  const installedDir = PROJECT_SKILLS_DIR(cwd);
  await collectSkills(installedDir, "local", skills, seen, warnings, cwd);
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
        const count = (await readdir(fullDir).catch(() => [] as string[])).filter(
          (f) => f.endsWith(".md") || f.endsWith(".mdc"),
        ).length;
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
