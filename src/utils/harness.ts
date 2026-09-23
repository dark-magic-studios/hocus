import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists, readFile, writeFile, ensureDir } = fsExtra;
import type { TargetId } from "../compilers/types.js";
import { PROJECT_CONFIG_FILE } from "./paths.js";

/**
 * How hocus lays out provider files:
 * - "plugin": plugin-capable providers (Claude Code, Cursor, Antigravity) load
 *   everything from one bundle at .agents/plugins/<name>/, which carries a
 *   manifest per provider.
 * - "solo": every provider gets its files in its own dot-directory.
 * Providers without a plugin system (Codex, OpenCode, Command Code, Copilot)
 * are always laid out solo.
 */
export type HarnessFormat = "plugin" | "solo";

export const ALL_PROVIDERS: { id: TargetId; label: string; dir: string }[] = [
  { id: "claude-code", label: "Claude Code", dir: ".claude" },
  { id: "codex", label: "Codex", dir: ".codex" },
  { id: "opencode", label: "OpenCode", dir: ".opencode" },
  { id: "cursor", label: "Cursor", dir: ".cursor" },
  { id: "antigravity", label: "Antigravity", dir: ".agents" },
  { id: "command-code", label: "Command Code", dir: ".commandcode" },
  { id: "copilot", label: "GitHub Copilot", dir: ".github/agents" },
];

/** Providers that can load a hocus plugin bundle. */
export const PLUGIN_PROVIDERS: TargetId[] = ["claude-code", "cursor", "antigravity"];

/** Selected when nothing is specified and nothing else is detected. */
export const DEFAULT_PROVIDERS: TargetId[] = ["claude-code", "codex", "opencode", "cursor", "antigravity"];

/** CLI runner used to spawn the founder session for each provider, when one exists. */
export const PROVIDER_RUNNERS: Partial<Record<TargetId, string>> = {
  "claude-code": "claude",
  codex: "codex",
  opencode: "opencode",
  cursor: "agent",
  antigravity: "agy",
  copilot: "copilot",
};

export interface HarnessChoices {
  providers: TargetId[];
  format: HarnessFormat;
  symlinks: boolean;
  pluginName: string;
}

export interface HarnessConfig {
  cast?: string;
  providers?: TargetId[];
  format?: HarnessFormat;
  symlinks?: boolean;
  runner?: string;
  pluginName?: string;
}

export function isTargetId(value: string): value is TargetId {
  return ALL_PROVIDERS.some((p) => p.id === value);
}

export function parseProviderList(raw: string): TargetId[] {
  const ids = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const unknown = ids.filter((id) => !isTargetId(id));
  if (unknown.length) {
    throw new Error(
      `unknown provider(s): ${unknown.join(", ")} — expected ${ALL_PROVIDERS.map((p) => p.id).join(",")}`,
    );
  }
  return ids as TargetId[];
}

export function hasPluginProvider(providers: TargetId[]): boolean {
  return providers.some((p) => PLUGIN_PROVIDERS.includes(p));
}

/** True when this provider loads its files from the plugin bundle. */
export function usesPlugin(choices: Pick<HarnessChoices, "format" | "providers">, target: TargetId): boolean {
  return choices.format === "plugin" && PLUGIN_PROVIDERS.includes(target) && choices.providers.includes(target);
}

export function pluginRelDir(pluginName: string): string {
  return path.posix.join(".agents", "plugins", pluginName);
}

/** Marketplace name used for the repo-local Claude Code and Cursor marketplaces. */
export function marketplaceName(pluginName: string): string {
  return `${pluginName.replace(/-plugin$/, "")}-harness`;
}

/**
 * Repo-relative directories that mirror `.agents/skills/<name>`, as symlinks
 * or copies. Codex, OpenCode and Antigravity (solo) read `.agents/skills/`
 * directly, so they need no mirror.
 */
export function skillMirrorDirs(choices: HarnessChoices): string[] {
  const dirs: string[] = [];
  if (choices.format === "plugin" && hasPluginProvider(choices.providers)) {
    dirs.push(path.posix.join(pluginRelDir(choices.pluginName), "skills"));
  }
  if (choices.providers.includes("claude-code") && !usesPlugin(choices, "claude-code")) {
    dirs.push(".claude/skills");
  }
  if (choices.providers.includes("cursor") && !usesPlugin(choices, "cursor")) {
    dirs.push(".cursor/skills");
  }
  if (choices.providers.includes("command-code")) dirs.push(".commandcode/skills");
  if (choices.providers.includes("copilot")) dirs.push(".github/skills");
  return dirs;
}

/** Where compiled agents for a provider belong under the chosen format. */
export function agentDirFor(choices: HarnessChoices, target: TargetId): string {
  const plugin = pluginRelDir(choices.pluginName);
  switch (target) {
    case "claude-code":
      return usesPlugin(choices, target) ? `${plugin}/claude/agents/` : ".claude/agents/";
    case "cursor":
      return usesPlugin(choices, target) ? `${plugin}/cursor/agents/` : ".cursor/agents/";
    case "antigravity":
      return usesPlugin(choices, target) ? `${plugin}/agents/<name>/agent.md` : ".agents/agents/<name>/agent.md";
    case "codex":
      return ".codex/agents/<name>.toml";
    case "opencode":
      return ".opencode/agents/";
    case "command-code":
      return ".commandcode/agents/";
    case "copilot":
      return ".github/agents/<name>.agent.md";
  }
}

/**
 * Remaps a compiler's default (solo) relPath into the plugin bundle when the
 * provider is laid out as a plugin. Solo paths pass through untouched.
 */
export function resolveAgentRelPath(choices: HarnessChoices, target: TargetId, relPath: string): string {
  if (!usesPlugin(choices, target)) return relPath;
  const plugin = pluginRelDir(choices.pluginName);
  const posixRel = relPath.split(path.sep).join("/");
  switch (target) {
    case "claude-code":
      return path.join(plugin, "claude", "agents", path.basename(relPath));
    case "cursor":
      return path.join(plugin, "cursor", "agents", path.basename(relPath));
    case "antigravity":
      return path.join(plugin, posixRel.replace(/^\.agents\//, ""));
    default:
      return relPath;
  }
}

/** Human-readable summary of what init will lay down, one line per location. */
export function describeLayout(choices: HarnessChoices): string[] {
  const lines = [".agents/skills/, .agents/rules/, .agents/mcp_config.json — source of truth"];
  const verb = choices.symlinks ? "symlinked" : "copied";
  const mirrors = skillMirrorDirs(choices);
  if (mirrors.length) lines.push(`skills ${verb} into ${mirrors.join(", ")}`);
  if (choices.format === "plugin" && hasPluginProvider(choices.providers)) {
    const manifests = [
      choices.providers.includes("claude-code") ? ".claude-plugin/plugin.json" : null,
      choices.providers.includes("cursor") ? ".cursor-plugin/plugin.json" : null,
      choices.providers.includes("antigravity") ? "plugin.json (Antigravity)" : null,
    ].filter(Boolean);
    lines.push(`${pluginRelDir(choices.pluginName)}/ — plugin bundle with ${manifests.join(", ")}`);
  }
  for (const target of choices.providers) {
    const label = ALL_PROVIDERS.find((p) => p.id === target)?.label ?? target;
    lines.push(`${label}: agents -> ${agentDirFor(choices, target)}`);
  }
  return lines;
}

export async function readHarnessConfig(repoRoot: string): Promise<HarnessConfig> {
  const file = PROJECT_CONFIG_FILE(repoRoot);
  if (!(await pathExists(file))) return {};
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    if (!parsed || typeof parsed !== "object") return {};
    const config: HarnessConfig = {};
    if (typeof parsed.cast === "string") config.cast = parsed.cast;
    if (Array.isArray(parsed.providers)) config.providers = parsed.providers.filter(isTargetId);
    if (parsed.format === "plugin" || parsed.format === "solo") config.format = parsed.format;
    if (typeof parsed.symlinks === "boolean") config.symlinks = parsed.symlinks;
    if (typeof parsed.runner === "string") config.runner = parsed.runner;
    if (typeof parsed.pluginName === "string") config.pluginName = parsed.pluginName;
    return config;
  } catch {
    return {};
  }
}

/** Merges `patch` into .hocus/config.json, keeping keys hocus doesn't manage. */
export async function writeHarnessConfig(repoRoot: string, patch: HarnessConfig): Promise<void> {
  const file = PROJECT_CONFIG_FILE(repoRoot);
  let existing: Record<string, unknown> = {};
  if (await pathExists(file)) {
    try {
      existing = JSON.parse(await readFile(file, "utf8"));
    } catch {}
  }
  await ensureDir(path.dirname(file));
  await writeFile(file, JSON.stringify({ ...existing, ...patch }, null, 2) + "\n", "utf8");
}
