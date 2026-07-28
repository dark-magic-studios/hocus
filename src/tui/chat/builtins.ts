import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { runInit } from "../../commands/init.js";
import { runCast } from "../../commands/cast.js";
import { runSync } from "../../commands/sync.js";
import { runSkillAdd } from "../../commands/skill.js";
import type { TargetId } from "../../compilers/types.js";
import { getHocusStatus } from "../../utils/status.js";

export const BUILTIN_NAMES = ["init", "cast", "sync", "skill", "status", "run", "npm"] as const;
export type BuiltinName = (typeof BUILTIN_NAMES)[number] | string;

export function getBuiltinCommands(cwd?: string): string[] {
  const base = [...BUILTIN_NAMES];
  if (!cwd) return base;
  try {
    const pkgPath = path.join(cwd, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts && typeof pkg.scripts === "object") {
        return Array.from(new Set([...base, ...Object.keys(pkg.scripts)]));
      }
    }
  } catch {
    // ignore
  }
  return base;
}

export function isBuiltinCommand(token: string, cwd?: string): boolean {
  const available = getBuiltinCommands(cwd);
  return available.includes(token);
}

export interface BuiltinResult {
  ok: boolean;
  lines: string[];
}

export interface BuiltinContext {
  cwd: string;
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;

async function captureConsole<T>(fn: () => Promise<T>): Promise<{ lines: string[]; error?: string }> {
  const lines: string[] = [];
  const push = (...args: unknown[]) => lines.push(args.map(String).join(" ").replace(ANSI_RE, ""));
  const origLog = console.log;
  const origError = console.error;
  console.log = push;
  console.error = push;
  try {
    await fn();
    return { lines };
  } catch (e) {
    return { lines, error: e instanceof Error ? e.message : String(e) };
  } finally {
    console.log = origLog;
    console.error = origError;
  }
}

async function runExternalCommand(cmd: string, args: string[], cwd: string): Promise<BuiltinResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let output = "";
    child.stdout?.on("data", (d: Buffer) => {
      output += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      output += d.toString();
    });
    child.on("error", (err) => {
      resolve({ ok: false, lines: [`failed to run command: ${err.message}`] });
    });
    child.on("close", (code) => {
      const cleaned = output.replace(ANSI_RE, "").trim();
      const lines = cleaned.split("\n").filter((l) => l.length > 0);
      resolve({
        ok: code === 0,
        lines:
          lines.length > 0
            ? lines
            : [code === 0 ? "command completed successfully." : `command exited with code ${code}`],
      });
    });
  });
}

/**
 * Runs one of hocus's own CLI commands or project scripts from inside the seance tab
 * — `/cast`, `/sync`, `/skill add <name>`, `/init`, `/status`, `/run <script>`, `/npm <script>`, `/test`, etc.
 */
export async function runBuiltin(name: string, args: string[], ctx: BuiltinContext): Promise<BuiltinResult> {
  switch (name) {
    case "cast": {
      const targets = args[0] ? (args[0].split(",").map((t) => t.trim()) as TargetId[]) : undefined;
      const { lines, error } = await captureConsole(() => runCast({ repoRoot: ctx.cwd, targets }));
      return { ok: !error, lines: error ? [...lines, error] : lines };
    }
    case "sync": {
      const { lines, error } = await captureConsole(() => runSync({ repoRoot: ctx.cwd }));
      return { ok: !error, lines: error ? [...lines, error] : lines };
    }
    case "skill": {
      const [sub, skillName, ...rest] = args;
      if (sub !== "add" || !skillName) {
        return { ok: false, lines: ["usage: /skill add <name> [--from <path>]"] };
      }
      const fromIdx = rest.indexOf("--from");
      const from = fromIdx >= 0 ? rest[fromIdx + 1] : undefined;
      const { lines, error } = await captureConsole(() => runSkillAdd({ repoRoot: ctx.cwd, name: skillName, from }));
      return { ok: !error, lines: error ? [...lines, error] : lines };
    }
    case "init": {
      const { lines, error } = await captureConsole(() => runInit({ repoRoot: ctx.cwd }));
      return { ok: !error, lines: error ? [...lines, error] : lines };
    }
    case "status": {
      const status = await getHocusStatus(ctx.cwd);
      const lines = [
        `[hocus status]`,
        `  installation: ${status.installed ? "installed" : "not installed"}`,
        `  agents: ${status.agentCount}`,
        `  skills: ${status.skillCount}`,
        `  state: ${status.statusMessage}`,
        `  targets:`,
        ...status.targets.map(
          (t) => `    - ${t.label}: ${t.detected ? `${t.compiledCount} compiled` : "not detected"}`
        ),
      ];
      return { ok: true, lines };
    }
    case "run":
    case "npm": {
      const scriptName = args[0];
      if (!scriptName) {
        const available = getBuiltinCommands(ctx.cwd);
        return {
          ok: false,
          lines: ["usage: /run <script> or /npm <script>", `available commands: ${available.join(", ")}`],
        };
      }
      return runExternalCommand("npm", ["run", scriptName, "--", ...args.slice(1)], ctx.cwd);
    }
    default: {
      const pkgPath = path.join(ctx.cwd, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          if (pkg.scripts && typeof pkg.scripts === "object" && name in pkg.scripts) {
            return runExternalCommand("npm", ["run", name, "--", ...args], ctx.cwd);
          }
        } catch {
          // ignore
        }
      }
      return runExternalCommand(name, args, ctx.cwd);
    }
  }
}
