import path from "node:path";
import { spawnSync } from "node:child_process";
import fsExtra from "fs-extra";
const { ensureDir, writeFile, pathExists, copy } = fsExtra;
import { log } from "./log.js";
import { BUNDLED_SKILLS_DIR, PROJECT_PLUGINS_DIR } from "./paths.js";

export interface PluginInitOptions {
  dryRun?: boolean;
}

export interface IntegrationOptions {
  dryRun?: boolean;
  spawnFn?: typeof spawnSync;
}

export const MCP_SERVERS_CONFIG = {
  sequentialthinking: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    type: "stdio",
  },
  "code-review-graph": {
    command: "uvx",
    args: ["code-review-graph", "serve"],
    type: "stdio",
  },
  context7: {
    command: "npx",
    args: ["@anthropic-ai/context7"],
    type: "stdio",
  },
} as const;

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

export async function initializeAgentPlugin(
  repoRoot: string,
  projectName?: string,
  options: PluginInitOptions = {},
): Promise<{ pluginDir: string; pluginName: string }> {
  const baseName = projectName ?? path.basename(repoRoot);
  const pluginName = sanitizePluginName(baseName);
  const pluginDir = path.join(PROJECT_PLUGINS_DIR(repoRoot), pluginName);

  const manifest = {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: pluginName,
    version: "0.1.0",
    description: `Multi-agent harness plugin for ${baseName}`,
  };

  const mcpConfig = {
    $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
    mcpServers: MCP_SERVERS_CONFIG,
  };

  const cursorMcpConfig = {
    mcpServers: {
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
    },
  };

  const manifestPath = path.join(pluginDir, "plugin.json");
  const mcpPath = path.join(pluginDir, "mcp.json");
  const clientHooksDir = path.join(pluginDir, "com.example.client", "hooks");
  const cursorMcpPath = path.join(repoRoot, ".cursor", "mcp.json");
  const agentsMcpPath = path.join(repoRoot, ".agents", "mcp.json");

  if (options.dryRun) {
    log.planned(path.relative(repoRoot, manifestPath), "plugin manifest");
    log.planned(path.relative(repoRoot, mcpPath), "plugin mcp config");
    log.planned(path.relative(repoRoot, path.join(clientHooksDir, ".gitkeep")), "client hooks directory");
    log.planned(path.relative(repoRoot, cursorMcpPath), "Cursor MCP config");
    log.planned(path.relative(repoRoot, agentsMcpPath), "Antigravity MCP config");
  } else {
    await ensureDir(pluginDir);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    await writeFile(mcpPath, JSON.stringify(mcpConfig, null, 2) + "\n", "utf8");

    await ensureDir(clientHooksDir);
    await writeFile(path.join(clientHooksDir, ".gitkeep"), "", "utf8");

    await ensureDir(path.dirname(cursorMcpPath));
    await writeFile(cursorMcpPath, JSON.stringify(cursorMcpConfig, null, 2) + "\n", "utf8");

    await ensureDir(path.dirname(agentsMcpPath));
    await writeFile(agentsMcpPath, JSON.stringify(mcpConfig, null, 2) + "\n", "utf8");
  }

  return { pluginDir, pluginName };
}

function commandExists(cmd: string, spawnFn: typeof spawnSync = spawnSync): boolean {
  try {
    const res = spawnFn("which", [cmd], { stdio: "ignore" });
    return res.status === 0;
  } catch {
    return false;
  }
}

export async function installRtk(
  repoRoot: string,
  options: IntegrationOptions = {},
): Promise<void> {
  const { dryRun = false, spawnFn = spawnSync } = options;

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
  const cursorRulePath = path.join(repoRoot, ".cursor", "rules", "rtk.mdc");
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

  if (dryRun) {
    log.planned(path.relative(repoRoot, antigravityRulePath), "RTK Antigravity rule");
    log.planned(path.relative(repoRoot, cursorRulePath), "RTK Cursor rule");
    log.planned(path.relative(repoRoot, opencodePluginPath), "RTK OpenCode plugin");
    return;
  }

  await ensureDir(path.dirname(antigravityRulePath));
  await writeFile(antigravityRulePath, antigravityRuleContent, "utf8");

  await ensureDir(path.dirname(cursorRulePath));
  await writeFile(cursorRulePath, cursorRuleContent, "utf8");

  await ensureDir(path.dirname(opencodePluginPath));
  await writeFile(opencodePluginPath, opencodePluginContent, "utf8");

  if (commandExists("rtk", spawnFn)) {
    try {
      spawnFn("rtk", ["init", "--agent", "antigravity"], { cwd: repoRoot, stdio: "ignore" });
      spawnFn("rtk", ["init", "-g", "--agent", "cursor"], { cwd: repoRoot, stdio: "ignore" });
      spawnFn("rtk", ["init", "-g", "--opencode"], { cwd: repoRoot, stdio: "ignore" });
    } catch {
      // Ignore CLI execution errors; fallback rule files are written
    }
  }
}

export async function installGraphify(
  repoRoot: string,
  pluginName: string,
  options: IntegrationOptions = {},
): Promise<void> {
  const { dryRun = false, spawnFn = spawnSync } = options;

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
  const cursorRulePath = path.join(repoRoot, ".cursor", "rules", "graphify.mdc");
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

  // 4. Graphify Skill in plugin and .agents/skills
  const bundledGraphifySkill = path.join(BUNDLED_SKILLS_DIR, "graphify");
  const pluginSkillDest = path.join(PROJECT_PLUGINS_DIR(repoRoot), pluginName, "skills", "graphify");
  const agentsSkillDest = path.join(repoRoot, ".agents", "skills", "graphify");

  if (dryRun) {
    log.planned(path.relative(repoRoot, antigravityRulePath), "Graphify Antigravity rule");
    log.planned(path.relative(repoRoot, antigravityWorkflowPath), "Graphify Antigravity workflow");
    log.planned(path.relative(repoRoot, cursorRulePath), "Graphify Cursor rule");
    log.planned(path.relative(repoRoot, opencodePluginPath), "Graphify OpenCode plugin");
    log.planned(path.relative(repoRoot, opencodeConfigPath), "Graphify OpenCode config");
    log.planned(path.relative(repoRoot, pluginSkillDest), "Graphify plugin skill");
    log.planned(path.relative(repoRoot, agentsSkillDest), "Graphify agents skill");
    return;
  }

  await ensureDir(path.dirname(antigravityRulePath));
  await writeFile(antigravityRulePath, antigravityRuleContent, "utf8");

  await ensureDir(path.dirname(antigravityWorkflowPath));
  await writeFile(antigravityWorkflowPath, antigravityWorkflowContent, "utf8");

  await ensureDir(path.dirname(cursorRulePath));
  await writeFile(cursorRulePath, cursorRuleContent, "utf8");

  await ensureDir(path.dirname(opencodePluginPath));
  await writeFile(opencodePluginPath, opencodePluginContent, "utf8");

  await ensureDir(path.dirname(opencodeConfigPath));
  const opencodeConfig = {
    plugin: ["./plugins/graphify.js"],
  };
  await writeFile(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2) + "\n", "utf8");

  if (await pathExists(bundledGraphifySkill)) {
    await ensureDir(path.dirname(pluginSkillDest));
    await copy(bundledGraphifySkill, pluginSkillDest, { overwrite: true });

    await ensureDir(path.dirname(agentsSkillDest));
    await copy(bundledGraphifySkill, agentsSkillDest, { overwrite: true });
  }

  if (commandExists("graphify", spawnFn)) {
    try {
      spawnFn("graphify", ["install", "--project", "--platform", "antigravity"], { cwd: repoRoot, stdio: "ignore" });
      spawnFn("graphify", ["install", "--project", "--platform", "cursor"], { cwd: repoRoot, stdio: "ignore" });
      spawnFn("graphify", ["install", "--project", "--platform", "opencode"], { cwd: repoRoot, stdio: "ignore" });
    } catch {
      // Ignore CLI execution errors; fallback configurations are written
    }
  }
}
