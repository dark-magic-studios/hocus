#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runCast } from "./commands/cast.js";
import { runSkillAdd } from "./commands/skill.js";
import { runSync } from "./commands/sync.js";
import { runTui } from "./commands/tui.js";
import type { TargetId } from "./compilers/types.js";
import { log } from "./utils/log.js";

const program = new Command();

program
  .name("aviomancy")
  .description("A multi-agent harness generator — one persona spec, four tool-native outputs.")
  .version("0.1.0");

program
  .command("init")
  .description("bootstrap the persona cast, main files, and Claude Code agents into the current repo")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .action(async (opts: { name?: string }) => {
    await runInit({ repoRoot: process.cwd(), projectName: opts.name });
  });

program
  .command("cast")
  .description("scan the repo and (re)compile personas for every detected or specified target tool")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .option("-t, --targets <list>", "comma-separated targets: claude-code,opencode,cursor,antigravity")
  .action(async (opts: { name?: string; targets?: string }) => {
    const targets = opts.targets
      ? (opts.targets.split(",").map((t) => t.trim()) as TargetId[])
      : undefined;
    await runCast({ repoRoot: process.cwd(), projectName: opts.name, targets });
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
  .description("launch the terminal UI dashboard (requires Bun)")
  .option("-n, --name <name>", "project name (defaults to the directory name)")
  .action(async (opts: { name?: string }) => {
    await runTui({ repoRoot: process.cwd(), projectName: opts.name });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
