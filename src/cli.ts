#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runCast } from "./commands/cast.js";
import { runSkillAdd } from "./commands/skill.js";
import { runSync } from "./commands/sync.js";
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
  .description("A multi-agent harness generator — one persona spec, four tool-native outputs.")
  .version(VERSION)
  .option("--silent", "skip the boot animation when opening the command deck")
  .action(async (opts: { silent?: boolean }) => {
    await launchTui({ cwd: process.cwd(), version: VERSION, silent: opts.silent });
  });

program
  .command("init")
  .description("bootstrap the persona cast, main files, and agent harness into the current repo")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .option("-a, --agent [agent]", "agent runner to spawn (e.g. claude, opencode, agy, agent; default: claude)")
  .option("--claude", "use claude as the agent runner")
  .option("--opencode", "use opencode as the agent runner")
  .option("--agy", "use agy (antigravity) as the agent runner")
  .option("--antigravity", "use agy (antigravity) as the agent runner")
  .option("--dry-run", "print planned file writes without touching the filesystem")
  .action(
    async (opts: {
      name?: string;
      agent?: string | boolean;
      claude?: boolean;
      opencode?: boolean;
      agy?: boolean;
      antigravity?: boolean;
      dryRun?: boolean;
    }) => {
      let resolvedAgent = "claude";
      if (typeof opts.agent === "string" && opts.agent.trim()) {
        resolvedAgent = opts.agent.trim();
      } else if (opts.agent === true) {
        resolvedAgent = "agent";
      } else if (opts.opencode) {
        resolvedAgent = "opencode";
      } else if (opts.agy || opts.antigravity) {
        resolvedAgent = "agy";
      } else if (opts.claude) {
        resolvedAgent = "claude";
      }
      await runInit({
        repoRoot: process.cwd(),
        projectName: opts.name,
        agent: resolvedAgent,
        dryRun: opts.dryRun,
      });
    },
  );

program
  .command("cast")
  .description("scan the repo and (re)compile personas for every detected or specified target tool")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .option("-t, --targets <list>", "comma-separated targets: claude-code,opencode,cursor,antigravity")
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
