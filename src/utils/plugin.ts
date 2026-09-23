import path from "node:path";
import { spawnSync } from "node:child_process";
import fsExtra from "fs-extra";
const { ensureDir, writeFile, pathExists, readFile, readdir, remove } = fsExtra;
import type { TargetId } from "../compilers/types.js";
import { log } from "./log.js";
import { PROJECT_MCP_CONFIG_FILE, PROJECT_PLUGINS_DIR } from "./paths.js";
import { type HarnessChoices, PLUGIN_PROVIDERS, marketplaceName, pluginRelDir } from "./harness.js";
import { isSymlink, linkOrCopy } from "./link.js";

export interface PluginInitOptions {
  dryRun?: boolean;
  spawnFn?: typeof spawnSync;
}

export interface IntegrationOptions {
  dryRun?: boolean;
  spawnFn?: typeof spawnSync;
  /** Providers to configure (default: all that the integration supports). */
  providers?: TargetId[];
  /** Repo-relative directory for Cursor rules (default: .cursor/rules). */
  cursorRulesDir?: string;
}

export const AGY_MCP_SERVERS_CONFIG = {
  sequentialthinking: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
  },
  "code-review-graph": {
    command: "uvx",
    args: ["code-review-graph", "serve"],
  },
  context7: {
    command: "npx",
    args: ["@anthropic-ai/context7"],
  },
} as const;

export function commandExists(cmd: string, spawnFn: typeof spawnSync = spawnSync): boolean {
  try {
    const res = spawnFn("which", [cmd], { stdio: "ignore" });
    return res.status === 0;
  } catch {
    return false;
  }
}

export function buildAgyMcpAddArgs(
  name: string,
  server: {
    command?: string;
    serverUrl?: string;
    url?: string;
    args?: readonly string[] | string[];
    env?: Record<string, string>;
    headers?: Record<string, string>;
  },
): string[] {
  const cliArgs: string[] = ["mcp", "add"];
  if (server.env && typeof server.env === "object") {
    for (const [k, v] of Object.entries(server.env)) {
      cliArgs.push("-e", `${k}=${v}`);
    }
  }
  if (server.headers && typeof server.headers === "object") {
    for (const [k, v] of Object.entries(server.headers)) {
      cliArgs.push("--header", `${k}: ${v}`);
    }
  }
  cliArgs.push(name);
  if (server.command) {
    const sArgs = Array.isArray(server.args) ? server.args : [];
    const hasDash = sArgs.some((a) => a.startsWith("-"));
    if (hasDash) {
      cliArgs.push("--", server.command, ...sArgs);
    } else {
      cliArgs.push(server.command, ...sArgs);
    }
  } else {
    const targetUrl = server.serverUrl || server.url;
    if (targetUrl) {
      cliArgs.push(targetUrl);
    }
  }
  return cliArgs;
}

export function sanitizePluginName(rawName: string): string {
  let name = rawName
    .toLowerCase()
    .replace(/[^a-z0-9-.]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "");
  if (!name) {
    name = "hocus-plugin";
  }
  if (!name.endsWith("-plugin") && name.length <= 57) {
    name = `${name}-plugin`;
  }
  name = name.slice(0, 64).replace(/^[.-]+|[.-]+$/g, "");
  return name || "hocus-plugin";
}

/**
 * Lays down MCP config and, in plugin format, the plugin bundle at
 * .agents/plugins/<pluginName>/ — one directory that Claude Code, Cursor and
 * Antigravity each load through their own manifest:
 *
 *   plugin.json                  Antigravity manifest (workspace plugins live in .agents/plugins/)
 *   mcp_config.json              Antigravity MCP servers
 *   agents/<name>/agent.md       Antigravity subagents
 *   .claude-plugin/plugin.json   Claude Code manifest (agents: ./claude/agents/*.md, listed)
 *   .mcp.json                    Claude Code MCP servers
 *   claude/agents/               Claude Code subagents
 *   .cursor-plugin/plugin.json   Cursor manifest (agents/rules: ./cursor/..., listed)
 *   mcp.json                     Cursor MCP servers
 *   cursor/agents/, cursor/rules/
 *   skills/                      shared by all three (Agent Skills standard)
 *
 * Claude Code and Cursor discover the bundle through repo-root marketplaces
 * (.claude-plugin/marketplace.json, .cursor-plugin/marketplace.json);
 * .claude/settings.json registers and enables it for everyone who trusts the repo.
 *
 * `.agents/mcp_config.json` is the source of truth for MCP servers; every other
 * MCP file is a symlink to it or a copy of it.
 *
 * Claude Code only accepts explicit .md file paths for `agents` (no
 * directories or globs), so manifests list files; syncPluginManifests()
 * refreshes those lists whenever agents or rules change.
 */
export async function initializeAgentPlugin(
  repoRoot: string,
  choices: HarnessChoices,
  options: PluginInitOptions & { projectName?: string } = {},
): Promise<{ pluginDir: string; pluginName: string }> {
  const { dryRun = false } = options;
  const { pluginName, providers, symlinks } = choices;
  const baseName = options.projectName ?? path.basename(repoRoot);
  const description = `Multi-agent harness plugin for ${baseName}`;
  const pluginDir = path.join(PROJECT_PLUGINS_DIR(repoRoot), pluginName);
  const has = (id: TargetId) => providers.includes(id);

  // If repoRoot has an existing mcp_config.json, merge its servers
  let rootMcpServers: Record<string, any> = {};
  const rootMcpConfigPath = path.join(repoRoot, "mcp_config.json");
  if (await pathExists(rootMcpConfigPath)) {
    try {
      const raw = await readFile(rootMcpConfigPath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.mcpServers && typeof parsed.mcpServers === "object") {
        rootMcpServers = parsed.mcpServers;
      }
    } catch {}
  }

  const agyMcpServers: Record<string, any> = {
    ...AGY_MCP_SERVERS_CONFIG,
    ...rootMcpServers,
  };

  const writeJson = async (file: string, data: unknown, label: string) => {
    if (dryRun) {
      log.planned(path.relative(repoRoot, file), label);
      return;
    }
    if (await isSymlink(file)) await remove(file);
    await ensureDir(path.dirname(file));
    await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  };
  const mirror = (dest: string) =>
    linkOrCopy(canonicalMcpPath, dest, { symlink: symlinks, dryRun, repoRoot });

  const canonicalMcpPath = PROJECT_MCP_CONFIG_FILE(repoRoot);
  await writeJson(canonicalMcpPath, { mcpServers: agyMcpServers }, "MCP servers (source of truth)");

  const pluginProviders = choices.format === "plugin" ? providers.filter((p) => PLUGIN_PROVIDERS.includes(p)) : [];

  if (pluginProviders.length) {
    const manifestBase = { name: pluginName, version: "0.1.0", description };

    if (has("antigravity")) {
      await writeJson(
        path.join(pluginDir, "plugin.json"),
        { $schema: "https://antigravity.google/schemas/v1/plugin.json", name: pluginName, description },
        "Antigravity plugin manifest",
      );
      await mirror(path.join(pluginDir, "mcp_config.json"));
    }

    if (has("claude-code")) {
      await writeJson(
        path.join(pluginDir, ".claude-plugin", "plugin.json"),
        { ...manifestBase, agents: [] },
        "Claude Code plugin manifest",
      );
      await mirror(path.join(pluginDir, ".mcp.json"));
      await ensureKeepDir(path.join(pluginDir, "claude", "agents"), repoRoot, dryRun);
      await writeClaudeMarketplace(repoRoot, pluginName, description, baseName, dryRun);
    }

    if (has("cursor")) {
      await writeJson(
        path.join(pluginDir, ".cursor-plugin", "plugin.json"),
        { ...manifestBase, agents: [], rules: [], mcpServers: "./mcp.json" },
        "Cursor plugin manifest",
      );
      await mirror(path.join(pluginDir, "mcp.json"));
      await ensureKeepDir(path.join(pluginDir, "cursor", "agents"), repoRoot, dryRun);
      await writeJson(
        path.join(repoRoot, ".cursor-plugin", "marketplace.json"),
        {
          name: marketplaceName(pluginName),
          owner: { name: baseName },
          metadata: { description: `Local hocus harness for ${baseName}` },
          plugins: [{ name: pluginName, source: `./${pluginRelDir(pluginName)}`, description }],
        },
        "Cursor marketplace",
      );
    }
  } else {
    if (has("claude-code")) await mirror(path.join(repoRoot, ".mcp.json"));
    if (has("cursor")) await mirror(path.join(repoRoot, ".cursor", "mcp.json"));
  }

  await removeLegacyPluginFiles(repoRoot, pluginDir, dryRun);
  await syncPluginManifests(repoRoot, choices, { dryRun });

  // When scaffolding and the user has agy installed, pass the MCP configuration to AGY CLI
  const spawnFn = options.spawnFn ?? spawnSync;
  if (has("antigravity") && commandExists("agy", spawnFn)) {
    let configuredCount = 0;
    for (const [name, server] of Object.entries(agyMcpServers)) {
      const addArgs = buildAgyMcpAddArgs(name, server);
      if (addArgs.length > 2) {
        if (dryRun) {
          log.planned(`agy ${addArgs.join(" ")}`, "pass MCP config to agy CLI");
        } else {
          try {
            spawnFn("agy", addArgs, { cwd: repoRoot, stdio: "ignore" });
            configuredCount++;
          } catch {
            // Ignore CLI execution errors; fallback configuration files are written
          }
        }
      }
    }
    if (!dryRun && configuredCount > 0) {
      log.ok(`configured ${configuredCount} MCP servers for agy CLI`);
    }
  }

  return { pluginDir, pluginName };
}

/**
 * Rewrites the `agents` (and Cursor `rules`) lists in the plugin's Claude Code
 * and Cursor manifests from the files on disk. Call it after anything adds or
 * removes plugin agents or rules. Missing manifests are left alone.
 */
export async function syncPluginManifests(
  repoRoot: string,
  choices: Pick<HarnessChoices, "pluginName">,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  if (options.dryRun) return;
  const pluginDir = path.join(PROJECT_PLUGINS_DIR(repoRoot), choices.pluginName);
  const listFiles = async (rel: string, exts: string[]) => {
    const dir = path.join(pluginDir, rel);
    if (!(await pathExists(dir))) return [];
    return (await readdir(dir))
      .filter((f) => exts.some((ext) => f.endsWith(ext)))
      .sort()
      .map((f) => `./${rel}/${f}`);
  };
  const update = async (rel: string, fields: Record<string, string[]>) => {
    const file = path.join(pluginDir, rel);
    if (!(await pathExists(file))) return;
    try {
      const manifest = JSON.parse(await readFile(file, "utf8"));
      await writeFile(file, JSON.stringify({ ...manifest, ...fields }, null, 2) + "\n", "utf8");
    } catch {
      log.warn(`couldn't parse ${path.relative(repoRoot, file)} — skipped refreshing its file lists`);
    }
  };
  await update(path.join(".claude-plugin", "plugin.json"), {
    agents: await listFiles("claude/agents", [".md"]),
  });
  await update(path.join(".cursor-plugin", "plugin.json"), {
    agents: await listFiles("cursor/agents", [".md"]),
    rules: await listFiles("cursor/rules", [".mdc", ".md"]),
  });
}

async function ensureKeepDir(dir: string, repoRoot: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    log.planned(path.relative(repoRoot, dir) + "/");
    return;
  }
  await ensureDir(dir);
  const entries = await readdir(dir);
  if (entries.length === 0) await writeFile(path.join(dir, ".gitkeep"), "", "utf8");
}

/**
 * Writes .claude-plugin/marketplace.json at the repo root and registers it in
 * .claude/settings.json (extraKnownMarketplaces + enabledPlugins), merging
 * into whatever settings already exist.
 */
async function writeClaudeMarketplace(
  repoRoot: string,
  pluginName: string,
  description: string,
  owner: string,
  dryRun: boolean,
): Promise<void> {
  const market = marketplaceName(pluginName);
  const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const settingsPath = path.join(repoRoot, ".claude", "settings.json");
  if (dryRun) {
    log.planned(path.relative(repoRoot, marketplacePath), "Claude Code marketplace");
    log.planned(path.relative(repoRoot, settingsPath), `enable ${pluginName}@${market}`);
    return;
  }

  const marketplace = {
    name: market,
    owner: { name: owner },
    metadata: { description: `Local hocus harness for ${owner}` },
    plugins: [{ name: pluginName, source: `./${pluginRelDir(pluginName)}`, description }],
  };
  await ensureDir(path.dirname(marketplacePath));
  await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf8");

  let settings: Record<string, any> = {};
  if (await pathExists(settingsPath)) {
    try {
      settings = JSON.parse(await readFile(settingsPath, "utf8"));
    } catch {
      log.warn(`couldn't parse ${path.relative(repoRoot, settingsPath)} — enable the plugin with /plugin install ${pluginName}@${market}`);
      return;
    }
  }
  settings.extraKnownMarketplaces = {
    ...(settings.extraKnownMarketplaces ?? {}),
    [market]: { source: { source: "directory", path: "." } },
  };
  settings.enabledPlugins = { ...(settings.enabledPlugins ?? {}), [`${pluginName}@${market}`]: true };
  await ensureDir(path.dirname(settingsPath));
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

/** Removes files earlier hocus versions wrote that match no provider's spec. */
async function removeLegacyPluginFiles(repoRoot: string, pluginDir: string, dryRun: boolean): Promise<void> {
  const legacy = [path.join(pluginDir, "com.example.client")];
  for (const file of [path.join(repoRoot, ".agents", "mcp.json"), path.join(pluginDir, "mcp.json")]) {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      if (String(parsed?.$schema ?? "").includes("agent-plugins.org")) legacy.push(file);
    } catch {}
  }
  try {
    const manifest = JSON.parse(await readFile(path.join(pluginDir, "plugin.json"), "utf8"));
    if (String(manifest?.$schema ?? "").includes("agent-plugins.org")) legacy.push(path.join(pluginDir, "plugin.json"));
  } catch {}

  for (const file of legacy) {
    if (!(await pathExists(file))) continue;
    if (dryRun) {
      log.planned(path.relative(repoRoot, file), "remove legacy agent-plugins.org file");
    } else {
      await remove(file);
      log.info(`removed legacy ${path.relative(repoRoot, file)}`);
    }
  }
}


export async function installRtk(
  repoRoot: string,
  options: IntegrationOptions = {},
): Promise<void> {
  const { dryRun = false, spawnFn = spawnSync } = options;
  const has = (id: TargetId) => !options.providers || options.providers.includes(id);
  const cursorRulesDir = options.cursorRulesDir ?? path.join(".cursor", "rules");

  // 1. Antigravity: .agents/rules/antigravity-rtk-rules.md
  const antigravityRulePath = path.join(repoRoot, ".agents", "rules", "antigravity-rtk-rules.md");
  const antigravityRuleContent = `# RTK - Rust Token Killer (Google Antigravity)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Always prefix shell commands with \`rtk\` to minimize token consumption.

Examples:

\`\`\`bash
rtk git status
rtk cargo test
rtk ls src/
rtk grep "pattern" src/
rtk find "*.rs" .
rtk docker ps
rtk gh pr list
\`\`\`

## Meta Commands

\`\`\`bash
rtk gain              # Show token savings
rtk gain --history    # Command history with savings
rtk discover          # Find missed RTK opportunities
rtk proxy <cmd>       # Run raw (no filtering, for debugging)
\`\`\`

## Why

RTK filters and compresses command output before it reaches the LLM context, saving 60-90% tokens on common operations. Always use \`rtk <cmd>\` instead of raw commands.
`;

  // 2. Cursor: .cursor/rules/rtk.mdc
  const cursorRulePath = path.join(repoRoot, cursorRulesDir, "rtk.mdc");
  const cursorRuleContent = `---
description: Always use RTK (Rust Token Killer) to execute shell commands to minimize token consumption
globs: *
alwaysApply: true
---

Always prefix shell commands with \`rtk\` (e.g. \`rtk git status\`, \`rtk cargo test\`, \`rtk pnpm test\`, \`rtk find\`, \`rtk grep\`).
RTK filters and compresses command output before it reaches the LLM context, saving 60-90% tokens on common operations.
`;

  // 3. OpenCode: .opencode/plugins/rtk.js
  const opencodePluginPath = path.join(repoRoot, ".opencode", "plugins", "rtk.js");
  const opencodePluginContent = `// RTK OpenCode plugin — rewrites commands to use rtk for token savings.
export const RtkOpenCodePlugin = async ({ $ }) => {
  try {
    await $\`which rtk\`.quiet();
  } catch {
    return {};
  }

  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase();
      if (tool !== "bash" && tool !== "shell") return;
      const args = output?.args;
      if (!args || typeof args !== "object") return;

      const command = args.command;
      if (typeof command !== "string" || !command) return;

      try {
        const result = await $\`rtk rewrite \${command}\`.quiet().nothrow();
        const rewritten = String(result.stdout).trim();
        if (rewritten && rewritten !== command) {
          args.command = rewritten;
        }
      } catch {
        // pass through
      }
    },
  };
};
`;

  const files: Array<[string, string, string, TargetId]> = [
    [antigravityRulePath, antigravityRuleContent, "RTK Antigravity rule", "antigravity"],
    [cursorRulePath, cursorRuleContent, "RTK Cursor rule", "cursor"],
    [opencodePluginPath, opencodePluginContent, "RTK OpenCode plugin", "opencode"],
  ];
  await writeIntegrationFiles(repoRoot, files.filter(([, , , id]) => has(id)), dryRun);
  if (dryRun) return;

  if (commandExists("rtk", spawnFn)) {
    try {
      if (has("antigravity")) spawnFn("rtk", ["init", "--agent", "antigravity"], { cwd: repoRoot, stdio: "ignore" });
      if (has("cursor")) spawnFn("rtk", ["init", "-g", "--agent", "cursor"], { cwd: repoRoot, stdio: "ignore" });
      if (has("opencode")) spawnFn("rtk", ["init", "-g", "--opencode"], { cwd: repoRoot, stdio: "ignore" });
    } catch {
      // Ignore CLI execution errors; fallback rule files are written
    }
  }
}

/**
 * Configures graphify per provider. The graphify skill itself ships with the
 * bundled skills, so it is installed (and mirrored) with the rest of them.
 */
export async function installGraphify(
  repoRoot: string,
  options: IntegrationOptions = {},
): Promise<void> {
  const { dryRun = false, spawnFn = spawnSync } = options;
  const has = (id: TargetId) => !options.providers || options.providers.includes(id);
  const cursorRulesDir = options.cursorRulesDir ?? path.join(".cursor", "rules");

  // 1. Antigravity: .agents/rules/graphify.md and .agents/workflows/graphify.md
  const antigravityRulePath = path.join(repoRoot, ".agents", "rules", "graphify.md");
  const antigravityWorkflowPath = path.join(repoRoot, ".agents", "workflows", "graphify.md");
  const antigravityRuleContent = `---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ for codebase and architecture questions.
---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- For codebase or architecture questions, when \`graphify-out/graph.json\` exists, first run \`graphify query "<question>"\` (CLI) or \`query_graph\` (MCP). Use \`graphify path "<A>" "<B>"\` / \`shortest_path\` for relationships and \`graphify explain "<concept>"\` / \`get_node\` for focused concepts. These return a scoped subgraph, usually much smaller than \`GRAPH_REPORT.md\` or raw grep output.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context
- After modifying code files in this session, run \`graphify update .\` to keep the graph current (AST-only, no API cost)
`;

  const antigravityWorkflowContent = `# graphify workflow
1. Run \`graphify extract .\` or \`graphify update .\`
2. Query knowledge graph with \`graphify query "<question>"\`
`;

  // 2. Cursor: .cursor/rules/graphify.mdc
  const cursorRulePath = path.join(repoRoot, cursorRulesDir, "graphify.mdc");
  const cursorRuleContent = `---
description: graphify knowledge graph context
alwaysApply: true
---

This project has a graphify knowledge graph at graphify-out/.

- For codebase or architecture questions, when \`graphify-out/graph.json\` exists, first run \`graphify query "<question>"\` (or \`graphify path "<A>" "<B>"\` / \`graphify explain "<concept>"\`). These return a scoped subgraph, usually much smaller than \`GRAPH_REPORT.md\` or raw grep output.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context
- After modifying code files in this session, run \`graphify update .\` to keep the graph current (AST-only, no API cost)
`;

  // 3. OpenCode: .opencode/plugins/graphify.js and .opencode/opencode.json
  const opencodePluginPath = path.join(repoRoot, ".opencode", "plugins", "graphify.js");
  const opencodePluginContent = `// graphify OpenCode plugin
import { existsSync } from "fs";
import { join } from "path";

export const GraphifyPlugin = async ({ directory }) => {
  let reminded = false;

  return {
    "tool.execute.before": async (input, output) => {
      if (reminded) return;
      if (!existsSync(join(directory, "graphify-out", "graph.json"))) return;

      if (input.tool === "bash") {
        output.args.command =
          'echo "[graphify] knowledge graph at graphify-out/. For focused questions, run \\\`graphify query \\\\"<question>\\\\"\\\` (scoped subgraph, usually much smaller than GRAPH_REPORT.md) instead of grepping raw files. Read GRAPH_REPORT.md only for broad architecture context." && ' +
          output.args.command;
        reminded = true;
      }
    },
  };
};
`;

  const opencodeConfigPath = path.join(repoRoot, ".opencode", "opencode.json");
  const opencodeConfigContent = JSON.stringify({ plugin: ["./plugins/graphify.js"] }, null, 2) + "\n";

  const files: Array<[string, string, string, TargetId]> = [
    [antigravityRulePath, antigravityRuleContent, "Graphify Antigravity rule", "antigravity"],
    [antigravityWorkflowPath, antigravityWorkflowContent, "Graphify Antigravity workflow", "antigravity"],
    [cursorRulePath, cursorRuleContent, "Graphify Cursor rule", "cursor"],
    [opencodePluginPath, opencodePluginContent, "Graphify OpenCode plugin", "opencode"],
    [opencodeConfigPath, opencodeConfigContent, "Graphify OpenCode config", "opencode"],
  ];
  await writeIntegrationFiles(repoRoot, files.filter(([, , , id]) => has(id)), dryRun);
  if (dryRun) return;

  if (commandExists("graphify", spawnFn)) {
    try {
      for (const platform of ["antigravity", "cursor", "opencode"] as const) {
        if (has(platform)) {
          spawnFn("graphify", ["install", "--project", "--platform", platform], { cwd: repoRoot, stdio: "ignore" });
        }
      }
    } catch {
      // Ignore CLI execution errors; fallback configurations are written
    }
  }
}

async function writeIntegrationFiles(
  repoRoot: string,
  files: Array<[string, string, string, TargetId]>,
  dryRun: boolean,
): Promise<void> {
  for (const [file, content, label] of files) {
    if (dryRun) {
      log.planned(path.relative(repoRoot, file), label);
      continue;
    }
    await ensureDir(path.dirname(file));
    await writeFile(file, content, "utf8");
  }
}
