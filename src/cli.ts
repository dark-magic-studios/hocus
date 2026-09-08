#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runCast } from "./commands/cast.js";
import { runAdd } from "./commands/add.js";
import { runSkillAdd } from "./commands/skill.js";
import { runSync } from "./commands/sync.js";
import { runUpgrade } from "./commands/upgrade.js";
import { launchTui } from "./tui/index.js";
import type { TargetId } from "./compilers/types.js";
import { log } from "./utils/log.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION: string = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
).version;

const program = new Command();

program
  .name("hocus")
  .description("A multi-agent harness generator — one persona spec, tool-native outputs.")
  .version(VERSION)
  .option("--silent", "skip the boot animation when opening the command deck")
  .action(async (opts: { silent?: boolean }) => {
    await launchTui({ cwd: process.cwd(), version: VERSION, silent: opts.silent });
  });

program
  .command("init")
  .description("bootstrap the persona cast, main files, and agent harness into the current repo")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .option("-a, --agent [agent]", "agent runner to spawn (e.g. claude, codex, opencode, agy, agent, copilot; default: claude)")
  .option("--claude", "use claude as the agent runner")
  .option("--codex", "use Codex as the agent runner")
  .option("--opencode", "use opencode as the agent runner")
  .option("--agy", "use agy (antigravity) as the agent runner")
  .option("--antigravity", "use agy (antigravity) as the agent runner")
  .option("--copilot", "use GitHub Copilot as the agent runner")
  .option("--no-copilot", "disable GitHub Copilot support (skips the interactive question)")
  .option("-m, --model <model>", "model for the spawned agent runner")
  .option(
    "-e, --effort <level>",
    "reasoning effort (Codex: config override; claude/agy: --effort; opencode: --variant; cursor: model[effort=…])",
  )
  .option("--cast <cast>", "naming convention: valley (Silicon Valley) or wizard (Merlin, etc.) — prompts interactively if omitted")
  .option("--command-code", "enable Command Code (cmdc) support: compile subagents to .commandcode/agents/, mirror skills, bake in taste instructions")
  .option("--no-command-code", "disable Command Code support (skips the interactive question)")
  .option("--no-rules", "skip installing workspace rules into .agents/rules/")
  .option("--dry-run", "print planned file writes without touching the filesystem")
  .action(
    async (opts: {
      name?: string;
      agent?: string | boolean;
      claude?: boolean;
      codex?: boolean;
      opencode?: boolean;
      agy?: boolean;
      antigravity?: boolean;
      copilot?: boolean;
      model?: string;
      effort?: string;
      dryRun?: boolean;
      cast?: string;
      commandCode?: boolean;
      rules?: boolean;
    }) => {
      let resolvedAgent = "claude";
      if (typeof opts.agent === "string" && opts.agent.trim()) {
        resolvedAgent = opts.agent.trim();
      } else if (opts.agent === true) {
        resolvedAgent = "agent";
      } else if (opts.codex) {
        resolvedAgent = "codex";
      } else if (opts.opencode) {
        resolvedAgent = "opencode";
      } else if (opts.agy || opts.antigravity) {
        resolvedAgent = "agy";
      } else if (opts.copilot) {
        resolvedAgent = "copilot";
      } else if (opts.claude) {
        resolvedAgent = "claude";
      }
      await runInit({
        repoRoot: process.cwd(),
        projectName: opts.name,
        agent: resolvedAgent,
        model: opts.model,
        effort: opts.effort,
        dryRun: opts.dryRun,
        cast: opts.cast,
        commandCode: opts.commandCode,
        copilot: opts.copilot,
        rules: opts.rules,
      });
    },
  );

program
  .command("cast")
  .description("scan the repo and (re)compile personas for every detected or specified target tool")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .option("-t, --targets <list>", "comma-separated targets: claude-code,codex,opencode,cursor,antigravity,command-code,copilot")
  .option("--dry-run", "print planned file writes without touching the filesystem")
  .action(async (opts: { name?: string; targets?: string; dryRun?: boolean }) => {
    const targets = opts.targets
      ? (opts.targets.split(",").map((t) => t.trim()) as TargetId[])
      : undefined;
    await runCast({
      repoRoot: process.cwd(),
      projectName: opts.name,
      targets,
      dryRun: opts.dryRun,
    });
  });

program
  .command("add")
  .description("add skills, agents, and/or rules to target provider(s) locally or globally")
  .option("-a, --agent <agent_id>", "ID or path of agent/persona to add")
  .option("-s, --skill <skill_id>", "ID or path of skill to add")
  .option("-r, --rule <rule_id>", "ID or path of rule to add (or 'all' for all template rules)")
  .option("-l, --local", "install in project repository (default)")
  .option("-g, --global", "install globally in home directory")
  .option("-p, --providers <providers>", "comma-separated list of providers: claude-code,codex,opencode,cursor,antigravity,command-code,copilot")
  .option("--from <path>", "custom path for skill or persona file/folder")
  .option("--dry-run", "print planned file writes without touching the filesystem")
  .action(
    async (opts: {
      agent?: string;
      skill?: string;
      rule?: string;
      local?: boolean;
      global?: boolean;
      providers?: string;
      from?: string;
      dryRun?: boolean;
    }) => {
      const providers = opts.providers
        ? (opts.providers.split(",").map((p) => p.trim()) as TargetId[])
        : undefined;
      await runAdd({
        repoRoot: process.cwd(),
        agent: opts.agent,
        skill: opts.skill,
        rule: opts.rule,
        local: opts.local,
        global: opts.global,
        providers,
        from: opts.from,
        dryRun: opts.dryRun,
      });
    },
  );

const skill = program.command("skill").description("manage skills");
skill
  .command("add <name>")
  .description("install a skill into .claude/skills/ and .agents/skills/")
  .option("--from <path>", "install from a local path instead of the bundled skills/")
  .action(async (name: string, opts: { from?: string }) => {
    await runSkillAdd({ repoRoot: process.cwd(), name, from: opts.from });
  });

program
  .command("sync")
  .description("regenerate dashboard.html from the current personas and _spells/ — no recompilation")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .action(async (opts: { name?: string }) => {
    await runSync({ repoRoot: process.cwd(), projectName: opts.name });
  });

program
  .command("upgrade")
  .description("update personas and static skills to latest bundled versions")
  .option("--dry-run", "print planned file writes without touching the filesystem")
  .option("--force", "overwrite even if files appear unchanged")
  .option("--cast <cast>", "override cast: valley or wizard (defaults to project's .hocus/config.json or inferred)")
  .option("--personas", "only update personas (default: both)")
  .option("--skills", "only update skills (default: both)")
  .option("--no-personas", "skip personas")
  .option("--no-skills", "skip skills")
  .action(async (opts: { dryRun?: boolean; force?: boolean; cast?: string; personas?: boolean; skills?: boolean }) => {
    const personas = opts.personas !== false;
    const skills = opts.skills !== false;
    // --personas/--skills flags: if user passes one explicitly, the other defaults to false unless also passed
    // Commander with --no- handles, but for --personas/--skills we need to infer intent
    // If only one of them is true via explicit flag, the other should be false.
    // We detect by checking if raw argv contains --personas or --skills
    const raw = process.argv.join(" ");
    const hasPersonasFlag = raw.includes("--personas");
    const hasSkillsFlag = raw.includes("--skills");
    let doPersonas = personas;
    let doSkills = skills;
    if (hasPersonasFlag && !hasSkillsFlag && !raw.includes("--no-skills")) doSkills = false;
    if (hasSkillsFlag && !hasPersonasFlag && !raw.includes("--no-personas")) doPersonas = false;
    await runUpgrade({
      repoRoot: process.cwd(),
      dryRun: opts.dryRun,
      force: opts.force,
      cast: opts.cast,
      personas: doPersonas,
      skills: doSkills,
    });
  });

program
  .command("tui")
  .description("launch the command deck (alias for running `hocus` with no subcommand)")
  .option("--silent", "skip the boot animation")
  .action(async (opts: { silent?: boolean }) => {
    await launchTui({ cwd: process.cwd(), version: VERSION, silent: opts.silent });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
