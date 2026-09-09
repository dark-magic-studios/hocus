import path from "node:path";
import { spawnSync } from "node:child_process";
import * as readline from "node:readline";
import fsExtra from "fs-extra";
const { ensureDir, pathExists, readdir, readFile, writeFile, stat, copy, remove, unlink } = fsExtra;
import { log } from "../utils/log.js";
import {
  BUNDLED_PERSONAS_DIR,
  BUNDLED_SKILLS_DIR,
  BUNDLED_RULES_DIR,
  BUNDLED_SPELLS_DIR,
  PROJECT_PERSONAS_DIR,
  PROJECT_RULES_DIR,
  PROJECT_SPELLS_DIR,
} from "../utils/paths.js";
import { parseSoulFile } from "../schema/soul.js";
import { installSkill, writeCompiledFile } from "../utils/files.js";
import { commandCodeCompiler } from "../compilers/command-code.js";
import { codexCompiler } from "../compilers/codex.js";
import { copilotCompiler } from "../compilers/copilot.js";
import { confirmYesNo } from "../utils/prompt.js";
import {
  type Cast,
  CAST_MAP,
  PERSONA_SKILL_IDS,
  normalizeCast,
  describeCast,
  transformSoulForCast,
  getSoulFilenameForCast,
  getSkillIdForCast,
  transformSkillFrontmatterForCast,
} from "../utils/cast.js";
import { resolveValleySlug } from "../utils/cast-registry.js";

export interface InitOptions {
  repoRoot: string;
  projectName?: string;
  agent?: string;
  model?: string;
  effort?: string;
  dryRun?: boolean;
  spawnFn?: typeof spawnSync;
  cast?: string;
  /** true = force Command Code support, false = disable, undefined = ask/auto-detect. */
  commandCode?: boolean;
  /** true = force GitHub Copilot support, false = disable, undefined = ask/auto-detect. */
  copilot?: boolean;
  /** whether to install template rules into .agents/rules/ (default: true) */
  rules?: boolean;
}

export interface AgentSpawnSpec {
  command: string;
  args: string[];
}

export interface AgentSpawnOptions {
  model?: string;
  effort?: string;
}

const combinedPrompt = (systemPrompt: string, userPrompt: string): string =>
  `System instructions:\n${systemPrompt}\n\nTask:\n${userPrompt}`;

/** Cursor agent encodes effort inside parameterized model brackets. */
const cursorModelWithEffort = (model: string, effort?: string): string => {
  if (!effort) return model;
  if (model.includes("[")) {
    // Already parameterized — inject effort= if missing, else leave as-is.
    if (/effort\s*=/.test(model)) return model;
    return model.replace(/\]$/, `,effort=${effort}]`);
  }
  return `${model}[effort=${effort}]`;
};

export function getAgentSpawnSpec(
  agentInput: string = "claude",
  systemPrompt: string,
  userPrompt: string,
  options: AgentSpawnOptions = {},
): AgentSpawnSpec {
  const normalized = agentInput.trim().toLowerCase();
  const model = options.model?.trim() || undefined;
  const effort = options.effort?.trim() || undefined;
  const prompt = combinedPrompt(systemPrompt, userPrompt);

  if (normalized === "claude" || normalized === "claude-code") {
    const args: string[] = [];
    if (model) args.push("--model", model);
    if (effort) args.push("--effort", effort);
    args.push("--system-prompt", systemPrompt, userPrompt);
    return { command: "claude", args };
  }

  if (normalized === "opencode") {
    // `run -i` supports --model and --variant (effort); plain TUI --prompt does not.
    if (model || effort) {
      const args: string[] = ["run", "-i"];
      if (model) args.push("-m", model);
      if (effort) args.push("--variant", effort);
      args.push(prompt);
      return { command: "opencode", args };
    }
    return {
      command: "opencode",
      args: ["--prompt", prompt],
    };
  }

  if (normalized === "agy" || normalized === "antigravity") {
    const args: string[] = [];
    if (model) args.push("--model", model);
    if (effort) args.push("--effort", effort);
    args.push("-i", prompt);
    return { command: "agy", args };
  }

  if (normalized === "agent" || normalized === "cursor") {
    if (effort && !model) {
      throw new Error(
        "cursor agent requires --model when --effort is set (e.g. --model sonnet-4 --effort high)",
      );
    }
    const args: string[] = [];
    if (model) args.push("--model", cursorModelWithEffort(model, effort));
    args.push(prompt);
    return { command: "agent", args };
  }

  if (normalized === "codex") {
    const args: string[] = [];
    if (model) args.push("--model", model);
    // Codex exposes reasoning effort as a config override, rather than a
    // dedicated CLI flag.
    if (effort) args.push("--config", `model_reasoning_effort=${JSON.stringify(effort)}`);
    args.push(userPrompt);
    return { command: "codex", args };
  }

  if (normalized === "copilot" || normalized === "github-copilot") {
    const args: string[] = [];
    if (model) args.push("--model", model);
    if (effort) args.push("--effort", effort);
    args.push("-i", prompt);
    return { command: "copilot", args };
  }

  const args: string[] = [];
  if (model) args.push("--model", model);
  if (effort) args.push("--effort", effort);
  args.push(prompt);
  return {
    command: agentInput.trim(),
    args,
  };
}

import { initializeAgentPlugin, installRtk, installGraphify } from "../utils/plugin.js";

const FOUNDER_SOUL = "founder";

function buildInitPrompt(cast: Cast, commandCode = false, copilot = false): string {
  const base = `scan the repository for its dependencies and tech stack. then, before proceeding with any setup:

1. **Confirm the tech stack with the user.** Present what you found: languages, frameworks, package manager, databases, cloud providers, CI/CD, and any notable tools or patterns. Ask the user to confirm or correct — do not proceed until they've validated it.

2. **Confirm the product definition with the user.** Ask what the project is, who the target users are, what the primary goals are, and any hard constraints (deadlines, compliance, platform limits). If a PRODUCT.md already exists, present it and ask for corrections.

Only after the user has confirmed both the tech stack and product definition should you proceed with the rest of the setup.`;

  const naming =
    cast === "valley"
      ? `3. **Confirm the naming convention is Silicon Valley.** The user has chosen the **Silicon Valley** cast — personas use Silicon Valley character names (Richard, Jared, Gilfoyle, Dinesh, Erlich, Gavin, Laurie, Monica, Peter Gregory, Russ, etc.) and skills are prefixed with those names (e.g. /richard-draft-potion, /jared-orchestrate, /gilfoyle-pr-review). Use Silicon Valley names consistently for all personas, skills, and references. Do not mix in wizard names.`
      : `3. **Confirm the naming convention is Wizards.** The user has chosen the **Wizard** cast — personas use wizard names (Merlin, Roger Bacon, Zoroaster, Flamel, Circe, The Apprentice, John Dee, Nostradamus, Midas, Prospero, etc.) and skills are prefixed with those names (e.g. /merlin-draft-potion, /roger-bacon-orchestrate, /zoroaster-pr-review). Use wizard names consistently for all personas, skills, and references. Do not mix in Silicon Valley names.`;

  const tail = `Then create a team of 5-10 agents and skills and ask the user to accept/tweak each of them. each of them should have a soul based on a soul from this repository which will dictate the tone and output of the agent. also include specialized skills for this repository (for example a new-component or new-hook for frontend and new-controller or new-model for backend). the team must include an orchestrator agent whose job is to (1) maintain battle plans — structured markdown files that break down active goals into phases, tasks, and owners — and keep them up to date as work progresses, and (2) read the planner's task queue and delegate individual tasks to the appropriate specialized sub-agents by spawning them with the right context. create a hocus.md with the agents to be created, mark them as done once you've stopped working on them and after all are done build the initial dashboard.html for this the project. also set up the project's foundational documents: PRODUCT.md (product vision, goals, target users), AGENTS.md (registry of all created agents), MEMORY.md (persistent memory index), and TASKS.md (current work items). starter spells (atomic conventions, templates, hooks, and guardrails) have been installed under _spells/ (incantations/, wards/, curses/) — adhere to them and create additional spells as conventions emerge. fill each with real content derived from the repository — not placeholder text. skills and MCP servers have been pre-installed in the agent plugin under .agents/plugins/ (following agent-plugins.org convention), in .agents/mcp_config.json (following agy CLI convention), and .agents/skills/ — reference them when creating agents, and create additional project-specific skills as needed. workspace rules and coding guidelines have been installed under .agents/rules/ (architecture, subagent conventions, token efficiency, commit hygiene, testing standards, etc.) — adhere to them and reference them when configuring the project and defining agent roles. RTK and graphify have also been configured across providers.`;

  const commandCodeSection = commandCode
    ? `\n\nCommand Code support: this project uses Command Code (cmdc) as one of its agent harnesses. Native subagents are pre-compiled into .commandcode/agents/ and skills are mirrored into .commandcode/skills/ — maintain them when creating agents and skills (a Command Code subagent is a markdown file with name/description/tools frontmatter whose body is the system prompt). The user's learned preferences ("taste") live in .commandcode/taste/taste.md plus category packages in .commandcode/taste/<category>/taste.md (global ones in ~/.commandcode/taste/) — read them before starting work, treat them as requirements, never hand-edit them, and record any preference the user states using the taste tool. Document this in AGENTS.md so every agent stays taste-compatible.`
    : "";

  const copilotSection = copilot
    ? `\n\nGitHub Copilot support: this project uses GitHub Copilot as one of its agent harnesses. Native custom agents are pre-compiled into .github/agents/ (<character>.agent.md) and skills are mirrored into .github/skills/ — maintain them when creating agents and skills.`
    : "";

  return `${base}\n\n${naming}\n\n${tail}${commandCodeSection}${copilotSection}`;
}

// Keep legacy export for tests that may import INIT_PROMPT
export const INIT_PROMPT = buildInitPrompt("wizard");

/**
 * Compile every persona into native Command Code subagents under
 * .commandcode/agents/, each with taste-compatibility instructions baked in.
 * Prefers project personas (init just wrote them); falls back to the bundled
 * cast in dry-runs where nothing has been written yet.
 */
async function installCommandCodeAgents(
  repoRoot: string,
  cast: Cast,
  dryRun: boolean,
): Promise<number> {
  const projectDir = PROJECT_PERSONAS_DIR(repoRoot);
  let files = (await readdir(projectDir).catch(() => [] as string[])).filter((f) =>
    f.endsWith(".soul.md"),
  );
  let sourceDir = projectDir;
  if (!files.length) {
    sourceDir = BUNDLED_PERSONAS_DIR;
    files = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
  }

  const { default: matter } = await import("gray-matter");
  let count = 0;
  for (const file of files) {
    const fullPath = path.join(sourceDir, file);
    let soul: ReturnType<typeof parseSoulFile>;
    if (sourceDir === BUNDLED_PERSONAS_DIR) {
      // Bundled souls carry valley naming — transform to the active cast and
      // parse inline (dry-run must not depend on files already on disk).
      const raw = await readFile(fullPath, "utf8");
      const transformed = transformSoulForCast(raw, cast);
      const { data, content } = matter(transformed);
      soul = { ...data, sourcePath: fullPath, body: content.trim() } as ReturnType<
        typeof parseSoulFile
      >;
    } else {
      soul = parseSoulFile(fullPath);
    }
    const compiled = commandCodeCompiler.compile(soul, {
      repoRoot,
      stack: { languages: [], frameworks: [] },
    });
    await writeCompiledFile(repoRoot, compiled, { dryRun, target: "Command Code" });
    count++;
  }
  return count;
}

/** Compile the cast into Codex's project-scoped custom-agent TOML files. */
async function installCodexAgents(
  repoRoot: string,
  cast: Cast,
  dryRun: boolean,
): Promise<number> {
  const projectDir = PROJECT_PERSONAS_DIR(repoRoot);
  let files = (await readdir(projectDir).catch(() => [] as string[])).filter((f) =>
    f.endsWith(".soul.md"),
  );
  let sourceDir = projectDir;
  if (!files.length) {
    sourceDir = BUNDLED_PERSONAS_DIR;
    files = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
  }

  const { default: matter } = await import("gray-matter");
  for (const file of files) {
    const fullPath = path.join(sourceDir, file);
    let soul: ReturnType<typeof parseSoulFile>;
    if (sourceDir === BUNDLED_PERSONAS_DIR) {
      const raw = await readFile(fullPath, "utf8");
      const transformed = transformSoulForCast(raw, cast);
      const { data, content } = matter(transformed);
      soul = { ...data, sourcePath: fullPath, body: content.trim() } as ReturnType<typeof parseSoulFile>;
    } else {
      soul = parseSoulFile(fullPath);
    }
    await writeCompiledFile(repoRoot, codexCompiler.compile(soul, {
      repoRoot,
      stack: { languages: [], frameworks: [] },
    }), { dryRun, target: "Codex" });
  }
  return files.length;
}

/** Compile the cast into GitHub Copilot's project-scoped custom-agent .agent.md files. */
async function installCopilotAgents(
  repoRoot: string,
  cast: Cast,
  dryRun: boolean,
): Promise<number> {
  const projectDir = PROJECT_PERSONAS_DIR(repoRoot);
  let files = (await readdir(projectDir).catch(() => [] as string[])).filter((f) =>
    f.endsWith(".soul.md"),
  );
  let sourceDir = projectDir;
  if (!files.length) {
    sourceDir = BUNDLED_PERSONAS_DIR;
    files = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
  }

  const { default: matter } = await import("gray-matter");
  let count = 0;
  for (const file of files) {
    const fullPath = path.join(sourceDir, file);
    let soul: ReturnType<typeof parseSoulFile>;
    if (sourceDir === BUNDLED_PERSONAS_DIR) {
      const raw = await readFile(fullPath, "utf8");
      const transformed = transformSoulForCast(raw, cast);
      const { data, content } = matter(transformed);
      soul = { ...data, sourcePath: fullPath, body: content.trim() } as ReturnType<
        typeof parseSoulFile
      >;
    } else {
      soul = parseSoulFile(fullPath);
    }
    const compiled = copilotCompiler.compile(soul, {
      repoRoot,
      stack: { languages: [], frameworks: [] },
    });
    await writeCompiledFile(repoRoot, compiled, { dryRun, target: "GitHub Copilot" });
    count++;
  }
  return count;
}

/**
 * Install template rules into .agents/rules/
 */
export async function installRules(
  repoRoot: string,
  options: { dryRun?: boolean } = {},
): Promise<number> {
  const rulesDir = PROJECT_RULES_DIR(repoRoot);
  if (!(await pathExists(BUNDLED_RULES_DIR))) {
    return 0;
  }
  const files = (await readdir(BUNDLED_RULES_DIR)).filter((f) => f.endsWith(".md"));
  if (!options.dryRun) {
    await ensureDir(rulesDir);
  }
  let installedCount = 0;
  for (const file of files) {
    const dest = path.join(rulesDir, file);
    if (await pathExists(dest)) continue;
    if (options.dryRun) {
      log.planned(path.relative(repoRoot, dest));
    } else {
      await copy(path.join(BUNDLED_RULES_DIR, file), dest);
    }
    installedCount++;
  }
  return installedCount;
}

/**
 * Install starter spells into _spells/ and generate manifest.json
 */
export async function installSpells(
  repoRoot: string,
  options: { dryRun?: boolean } = {},
): Promise<number> {
  const spellsDir = PROJECT_SPELLS_DIR(repoRoot);
  if (!(await pathExists(BUNDLED_SPELLS_DIR))) {
    return 0;
  }
  const fg = (await import("fast-glob")).default;
  const files = await fg("**/*.md", { cwd: BUNDLED_SPELLS_DIR, onlyFiles: true });
  let installedCount = 0;
  for (const relFile of files) {
    const dest = path.join(spellsDir, relFile);
    if (await pathExists(dest)) continue;
    if (options.dryRun) {
      log.planned(path.relative(repoRoot, dest));
    } else {
      await ensureDir(path.dirname(dest));
      await copy(path.join(BUNDLED_SPELLS_DIR, relFile), dest);
    }
    installedCount++;
  }
  if (!options.dryRun) {
    const { readSpells, writeSpellsManifest } = await import("../schema/spell.js");
    const spells = await readSpells(spellsDir);
    if (spells.length > 0) {
      await writeSpellsManifest(spellsDir, spells);
    }
  } else {
    log.planned(path.join("_spells", "manifest.json"));
  }
  return installedCount;
}

async function resolveCast(opts: { cast?: string; dryRun?: boolean }): Promise<Cast> {
  if (opts.cast) {
    const normalized = normalizeCast(opts.cast);
    if (!normalized) {
      throw new Error(`invalid --cast value "${opts.cast}" — expected "wizard" or "valley" (or "silicon valley")`);
    }
    log.ok(`using ${describeCast(normalized)} cast (--cast ${normalized})`);
    return normalized;
  }

  if (opts.dryRun) {
    log.info(`dry run — defaulting to ${describeCast("wizard")} cast (pass --cast valley|wizard to override)`);
    return "wizard";
  }

  // Non-interactive fallback
  if (!process.stdin.isTTY) {
    log.info(`non-interactive — defaulting to ${describeCast("wizard")} cast`);
    return "wizard";
  }

  return promptForCast();
}

function promptForCast(): Promise<Cast> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("");
    console.log("Choose a naming convention for personas and skills:");
    console.log("  1) Silicon Valley — Richard, Jared, Gilfoyle, Dinesh...  (/richard-draft-potion, /jared-orchestrate)");
    console.log("  2) Wizards — Merlin, Roger Bacon, Zoroaster, Flamel...   (/merlin-draft-potion, /roger-bacon-orchestrate)");
    console.log("");
    rl.question("Select cast [1=valley, 2=wizard] (default: 2): ", (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "1" || a === "valley" || a === "silicon" || a === "silicon valley" || a === "sv") {
        resolve("valley");
        return;
      }
      if (a === "2" || a === "wizard" || a === "wizards" || a === "occult" || a === "" ) {
        resolve("wizard");
        return;
      }
      // ambiguous — default to wizard
      console.log(`Unrecognised choice "${answer}" — defaulting to wizards.`);
      resolve("wizard");
    });
  });
}

export async function runInit({
  repoRoot,
  projectName,
  agent = "claude",
  model,
  effort,
  dryRun = false,
  spawnFn = spawnSync,
  cast: castOpt,
  commandCode: commandCodeOpt,
  copilot: copilotOpt,
  rules = true,
}: InitOptions): Promise<void> {
  log.heading(`initializing hocus in ${repoRoot}`);
  if (dryRun) {
    log.info("dry run — no files will be written");
  }

  const cast = await resolveCast({ cast: castOpt, dryRun });

  // Resolve Command Code (cmdc) support: an explicit flag wins; otherwise ask
  // in a TTY (defaulting to what detection finds), else auto-detect.
  let useCommandCode = commandCodeOpt;
  if (useCommandCode === undefined) {
    const detected = await commandCodeCompiler.detect(repoRoot);
    if (process.stdin.isTTY) {
      useCommandCode = await confirmYesNo(
        `Do you use Command Code (cmdc)?${detected ? " (found an existing .commandcode/ directory)" : ""}`,
        detected,
      );
    } else {
      useCommandCode = detected;
      if (detected) {
        log.info("detected .commandcode/ — enabling Command Code support (pass --no-command-code to disable)");
      }
    }
  }
  if (useCommandCode) {
    log.ok("Command Code support enabled — subagents -> .commandcode/agents/, skills -> .commandcode/skills/");
  }

  // Resolve GitHub Copilot support: an explicit flag wins; otherwise auto-detect or infer from agent runner.
  let useCopilot = copilotOpt;
  if (useCopilot === undefined) {
    if (agent === "copilot" || agent === "github-copilot") {
      useCopilot = true;
    } else if (dryRun) {
      useCopilot = false;
    } else {
      useCopilot = await copilotCompiler.detect(repoRoot);
    }
  }
  if (useCopilot) {
    log.ok("GitHub Copilot support enabled — subagents -> .github/agents/, skills -> .github/skills/");
  }

  // Determine existing cast from config (if any) before migration
  const configPath = path.join(repoRoot, ".hocus", "config.json");
  let existingCast: Cast | undefined;
  if (await pathExists(configPath)) {
    try {
      const parsed = JSON.parse(await readFile(configPath, "utf8"));
      if (parsed.cast === "valley" || parsed.cast === "wizard") existingCast = parsed.cast;
    } catch {}
  }

  // 1. Copy bundled personas into the project so the founder soul can
  //    reference them when proposing the tailored cast — transformed for the chosen cast.
  const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
  if (!dryRun) {
    await ensureDir(personasDir);
  }

  // If cast changed (or hybrid legacy without config), migrate existing personas to chosen cast
  if (!dryRun && (existingCast !== undefined && existingCast !== cast)) {
    try {
      const existingFiles = (await readdir(personasDir).catch(() => [] as string[])).filter((f) => f.endsWith(".soul.md"));
      const { default: matter } = await import("gray-matter");
      for (const file of existingFiles) {
        const fullPath = path.join(personasDir, file);
        try {
          const raw = await readFile(fullPath, "utf8");
          const transformed = transformSoulForCast(raw, cast);
          if (transformed === raw) continue;
          const { data: tData } = matter(transformed);
          const targetFile = `${tData.character}.soul.md`;
          const destPath = path.join(personasDir, targetFile);
          if (fullPath !== destPath) {
            await writeFile(destPath, transformed, "utf8");
            await remove(fullPath);
            log.info(`migrated persona ${file} -> ${targetFile} (${describeCast(cast)})`);
          } else {
            await writeFile(destPath, transformed, "utf8");
            log.info(`updated persona ${file} to ${describeCast(cast)} naming`);
          }
        } catch {}
      }
    } catch {}
  } else if (!dryRun && existingCast === undefined && (await pathExists(personasDir))) {
    // Legacy hybrid check: no config yet, but personas exist with mismatched naming.
    // Migrate any persona whose character/display don't match chosen cast.
    try {
      const existingFiles = (await readdir(personasDir).catch(() => [] as string[])).filter((f) => f.endsWith(".soul.md"));
      const { default: matter } = await import("gray-matter");
      for (const file of existingFiles) {
        const fullPath = path.join(personasDir, file);
        try {
          const raw = await readFile(fullPath, "utf8");
          const transformed = transformSoulForCast(raw, cast);
          if (transformed === raw) continue;
          const { data: tData } = matter(transformed);
          const targetFile = `${tData.character}.soul.md`;
          const destPath = path.join(personasDir, targetFile);
          if (fullPath !== destPath) {
            await writeFile(destPath, transformed, "utf8");
            await remove(fullPath);
            log.info(`migrated persona ${file} -> ${targetFile} (${describeCast(cast)})`);
          } else {
            await writeFile(destPath, transformed, "utf8");
            log.info(`updated persona ${file} to ${describeCast(cast)} naming`);
          }
        } catch {}
      }
    } catch {}
  }

  const personaFiles = (await readdir(BUNDLED_PERSONAS_DIR)).filter((f) => f.endsWith(".soul.md"));
  let installedCount = 0;
  for (const file of personaFiles) {
    const baseSlug = path.basename(file, ".soul.md");
    const valleySlug = resolveValleySlug(baseSlug) ?? baseSlug;
    const targetFile = getSoulFilenameForCast(valleySlug, cast);
    const dest = path.join(personasDir, targetFile);
    if (await pathExists(dest)) continue;
    if (dryRun) {
      log.planned(path.relative(repoRoot, dest));
    } else {
      const raw = await readFile(path.join(BUNDLED_PERSONAS_DIR, file), "utf8");
      const transformed = transformSoulForCast(raw, cast);
      await writeFile(dest, transformed, "utf8");
    }
    installedCount++;
  }
  // If wizard cast renames files, ensure old valley-named files that already existed
  // from a previous valley init aren't left behind as duplicates — we don't delete,
  // but we log the active cast.
  log.ok(`installed ${installedCount} personas to .hocus/personas/ (${describeCast(cast)})`);

  // Persist chosen cast so future cast/sync operations know which convention is active.
  if (dryRun) {
    log.planned(path.relative(repoRoot, configPath));
  } else {
    await ensureDir(path.dirname(configPath));
    const existing = (await pathExists(configPath))
      ? JSON.parse(await readFile(configPath, "utf8")).cast
      : undefined;
    if (!existing) {
      await writeFile(configPath, JSON.stringify({ cast }, null, 2) + "\n", "utf8");
    } else if (existing !== cast) {
      // User explicitly re-ran init with a different cast — update.
      await writeFile(configPath, JSON.stringify({ cast }, null, 2) + "\n", "utf8");
      log.warn(`overwrote ${path.relative(repoRoot, configPath)} cast "${existing}" -> "${cast}"`);
    }
  }

  // 1b. Initialize the agent plugin (.agents/plugins/<pluginName>/) following agent-plugins.org and AGY CLI conventions
  const { pluginName } = await initializeAgentPlugin(repoRoot, projectName, { dryRun, spawnFn });
  log.ok(`initialized agent plugin "${pluginName}" at .agents/plugins/${pluginName}/`);

  // 1b-ii. Clean up stale persona-bound skills from the opposite cast when switching
  if (!dryRun) {
    for (const valleyId of PERSONA_SKILL_IDS) {
      const wizardName = getSkillIdForCast(valleyId, "wizard");
      if (valleyId === wizardName) continue;
      const staleName = cast === "valley" ? wizardName : valleyId;
      const stalePaths = [
        path.join(repoRoot, ".agents", "skills", staleName),
        path.join(repoRoot, ".agents", "plugins", pluginName, "skills", staleName),
        ...(useCommandCode ? [path.join(repoRoot, ".commandcode", "skills", staleName)] : []),
        ...(useCopilot ? [path.join(repoRoot, ".github", "skills", staleName)] : []),
      ];
      for (const p of stalePaths) {
        if (await pathExists(p)) {
          await remove(p);
          log.info(`removed stale ${path.relative(repoRoot, p)} (now ${describeCast(cast)})`);
        }
      }
    }
  } else if (existingCast !== undefined && existingCast !== cast) {
    for (const valleyId of PERSONA_SKILL_IDS) {
      const wizardName = getSkillIdForCast(valleyId, "wizard");
      if (valleyId === wizardName) continue;
      const staleName = cast === "valley" ? wizardName : valleyId;
      const bases = [
        path.join(".agents", "skills", staleName),
        path.join(".agents", "plugins", pluginName, "skills", staleName),
        ...(useCommandCode ? [path.join(".commandcode", "skills", staleName)] : []),
        ...(useCopilot ? [path.join(".github", "skills", staleName)] : []),
      ];
      for (const base of bases) {
        log.planned(base, `remove stale (${describeCast(cast)})`);
      }
    }
  }

  // 1c. Install all bundled skills into the agent plugin and .agents/skills/
  //     — renamed/retitled according to the chosen cast so skill ids match persona names.
  const skillDirs = (await readdir(BUNDLED_SKILLS_DIR)).filter(
    (f) => !f.startsWith(".") && f !== "example-skill",
  );
  let skillCount = 0;
  for (const skill of skillDirs) {
    const src = path.join(BUNDLED_SKILLS_DIR, skill);
    const s = await stat(src);
    if (!s.isDirectory()) continue;
    const targetSkillName = getSkillIdForCast(skill, cast);
    if (dryRun) {
      // Preview transformed skill name when it differs
      await installSkill(src, repoRoot, targetSkillName, { dryRun, pluginName, commandCode: useCommandCode, copilot: useCopilot });
    } else {
      const tmpTargets = await installSkill(src, repoRoot, targetSkillName, { dryRun, pluginName, commandCode: useCommandCode, copilot: useCopilot });
      // When cast transforms the skill id, patch SKILL.md frontmatter (name + description) in place.
      if (targetSkillName !== skill) {
        for (const target of tmpTargets) {
          const skillFile = path.join(target, "SKILL.md");
          if (await pathExists(skillFile)) {
            const raw = await readFile(skillFile, "utf8");
            const patched = transformSkillFrontmatterForCast(raw, cast);
            if (patched !== raw) await writeFile(skillFile, patched, "utf8");
          }
        }
      } else {
        // Even when id unchanged, still ensure description matches valley vs wizard naming
        // for persona-bound skills (e.g. wizard default already matches bundled wizard names,
        // but valley re-run needs to retitle).
        if (cast === "valley") {
          for (const target of tmpTargets) {
            const skillFile = path.join(target, "SKILL.md");
            if (await pathExists(skillFile)) {
              const raw = await readFile(skillFile, "utf8");
              // Only transform persona-bound skills; generic skills have no valley prefix.
              if (
                raw.includes("Richard") ||
                raw.includes("Merlin") ||
                raw.includes("Jared") ||
                raw.includes("Roger Bacon") ||
                raw.includes("Gilfoyle") ||
                raw.includes("Zoroaster") ||
                raw.includes("Erlich") ||
                raw.includes("Circe")
              ) {
                const patched = transformSkillFrontmatterForCast(raw, cast);
                if (patched !== raw) await writeFile(skillFile, patched, "utf8");
              }
            }
          }
        }
      }
    }
    skillCount++;
  }
  const skillTargetsMsg = [
    `.agents/plugins/${pluginName}/skills/`,
    `.agents/skills/`,
    useCommandCode ? `.commandcode/skills/` : "",
    useCopilot ? `.github/skills/` : "",
  ].filter(Boolean).join(" and ");
  log.ok(`installed ${skillCount} skills to ${skillTargetsMsg} (${describeCast(cast)})`);

  // Codex discovers repository skills from .agents/skills/, so the shared
  // installation above needs no mirror. Its custom subagents are TOML files.
  const codexAgentCount = await installCodexAgents(repoRoot, cast, dryRun);
  log.ok(`compiled ${codexAgentCount} Codex subagents to .codex/agents/ (skills use .agents/skills/)`);

  // 1f. Compile Command Code subagents (.commandcode/agents/) when enabled —
  //     each one gets taste-compatibility instructions baked into its body.
  if (useCommandCode) {
    const compiledCount = await installCommandCodeAgents(repoRoot, cast, dryRun);
    log.ok(`compiled ${compiledCount} Command Code subagents to .commandcode/agents/`);
  }

  // 1f-ii. Compile GitHub Copilot custom agents (.github/agents/) when enabled.
  if (useCopilot) {
    const copilotCount = await installCopilotAgents(repoRoot, cast, dryRun);
    log.ok(`compiled ${copilotCount} Copilot subagents to .github/agents/`);
  }

  // 1d. Install RTK on all providers (Antigravity, Cursor, OpenCode)
  await installRtk(repoRoot, { dryRun, spawnFn });
  log.ok("configured RTK for all providers (Antigravity, Cursor, OpenCode)");

  // 1e. Install Graphify on all providers (Antigravity, Cursor, OpenCode)
  await installGraphify(repoRoot, pluginName, { dryRun, spawnFn });
  log.ok("configured Graphify for all providers (Antigravity, Cursor, OpenCode)");

  // 1g. Install template workspace rules into .agents/rules/
  if (rules !== false) {
    const ruleCount = await installRules(repoRoot, { dryRun });
    log.ok(`installed ${ruleCount} workspace rules to .agents/rules/`);
  }

  // 1h. Install starter spells into _spells/ (incantations, wards, curses)
  const spellCount = await installSpells(repoRoot, { dryRun });
  log.ok(`installed ${spellCount} spells to _spells/ (incantations, wards, curses)`);

  // 2. Parse the founder soul (transformed, cast-aware) and fire an interactive
  //    agent session with its body as the system prompt and the cast-aware init task.
  const initPrompt = buildInitPrompt(cast, useCommandCode, useCopilot);
  let founder: ReturnType<typeof parseSoulFile>;
  if (dryRun) {
    const founderFile = path.join(BUNDLED_PERSONAS_DIR, `${FOUNDER_SOUL}.soul.md`);
    const founderRaw = (await pathExists(founderFile))
      ? await readFile(founderFile, "utf8")
      : await readFile(path.join(BUNDLED_PERSONAS_DIR, "peter-gregory.soul.md"), "utf8");
    const transformed = transformSoulForCast(founderRaw, cast);
    // Write to temp for parseSoulFile expectation of file path — fake it via matter
    const { default: matter } = await import("gray-matter");
    const { data, content } = matter(transformed);
    // Reuse parse logic via temporary file path semantics
    founder = {
      character: data.character,
      display_name: data.display_name,
      role: data.role,
      voice: data.voice,
      glyph: data.glyph,
      triggers: data.triggers ?? [],
      aliases: data.aliases,
      tools: data.tools,
      model: data.model,
      parent: data.parent,
      tier: data.tier,
      scope: data.scope,
      sourcePath: path.join(personasDir, getSoulFilenameForCast(FOUNDER_SOUL, cast)),
      body: content.trim(),
    } as ReturnType<typeof parseSoulFile>;
  } else {
    const founderPath = path.join(personasDir, getSoulFilenameForCast(FOUNDER_SOUL, cast));
    const founderFile = path.join(BUNDLED_PERSONAS_DIR, `${FOUNDER_SOUL}.soul.md`);
    // Fallback to bundled if transformed file missing (shouldn't happen, but be defensive)
    const resolvedPath = (await pathExists(founderPath))
      ? founderPath
      : (await pathExists(founderFile))
        ? founderFile
        : path.join(BUNDLED_PERSONAS_DIR, "peter-gregory.soul.md");
    founder = parseSoulFile(resolvedPath);
    const founderValleySlug = resolveValleySlug(FOUNDER_SOUL) ?? "peter-gregory";
    if (cast === "wizard" && founder.character !== CAST_MAP[founderValleySlug]?.wizardSlug) {
      // Defensive: ensure wizard display if somehow file wasn't transformed
      const raw = await readFile(resolvedPath, "utf8");
      const patched = transformSoulForCast(raw, cast);
      await writeFile(founderPath, patched, "utf8");
      founder = parseSoulFile(founderPath);
    }
  }

  log.ok(`firing ${founder.display_name} — ${founder.role} (${describeCast(cast)})`);

  const { command, args } = getAgentSpawnSpec(agent, founder.body, initPrompt, {
    model,
    effort,
  });

  if (dryRun) {
    const extras = [
      model ? `model=${model}` : null,
      effort ? `effort=${effort}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    log.info(
      `would spawn ${command}${extras ? ` (${extras})` : ""} — interactive session creates project docs and dashboard.html`,
    );
    return;
  }

  const result = spawnFn(command, args, {
    stdio: "inherit",
    cwd: repoRoot,
  });

  if (result.error) {
    throw new Error(`failed to spawn ${command}: ${result.error.message}`);
  }
}
