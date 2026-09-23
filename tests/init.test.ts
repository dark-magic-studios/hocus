import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists, readJson, readFile, readdir, outputFile, outputJson } = fsExtra;
import { readlink, realpath } from "node:fs/promises";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";
import { makeEmptyRepo, cleanupRepo } from "./tui-fixtures.js";
import { getAgentSpawnSpec, runInit } from "../src/commands/init.js";
import { isSymlink } from "../src/utils/link.js";
import { runCast } from "../src/commands/cast.js";

const origLog = console.log;
beforeEach(() => {
  console.log = () => {};
});
afterEach(() => {
  console.log = origLog;
});

test("getAgentSpawnSpec resolves correct specs for known and custom agents", () => {
  const sys = "sys prompt";
  const user = "user prompt";

  // claude
  const claudeSpec = getAgentSpawnSpec("claude", sys, user);
  assert.equal(claudeSpec.command, "claude");
  assert.deepEqual(claudeSpec.args, ["--system-prompt", sys, user]);

  const claudeCodeSpec = getAgentSpawnSpec("claude-code", sys, user);
  assert.equal(claudeCodeSpec.command, "claude");

  const codexSpec = getAgentSpawnSpec("codex", sys, user);
  assert.equal(codexSpec.command, "codex");
  assert.deepEqual(codexSpec.args, [user]);

  // opencode
  const opencodeSpec = getAgentSpawnSpec("opencode", sys, user);
  assert.equal(opencodeSpec.command, "opencode");
  assert.equal(opencodeSpec.args[0], "--prompt");
  assert.match(opencodeSpec.args[1]!, /sys prompt/);

  // agy / antigravity
  const agySpec = getAgentSpawnSpec("agy", sys, user);
  assert.equal(agySpec.command, "agy");
  assert.equal(agySpec.args[0], "-i");
  assert.match(agySpec.args[1]!, /sys prompt/);

  const antigravitySpec = getAgentSpawnSpec("antigravity", sys, user);
  assert.equal(antigravitySpec.command, "agy");

  // agent / cursor
  const agentSpec = getAgentSpawnSpec("agent", sys, user);
  assert.equal(agentSpec.command, "agent");
  assert.match(agentSpec.args[0]!, /sys prompt/);

  const cursorSpec = getAgentSpawnSpec("cursor", sys, user);
  assert.equal(cursorSpec.command, "agent");

  // copilot
  const copilotSpec = getAgentSpawnSpec("copilot", sys, user);
  assert.equal(copilotSpec.command, "copilot");
  assert.equal(copilotSpec.args[0], "-i");
  assert.match(copilotSpec.args[1]!, /sys prompt/);

  const ghCopilotSpec = getAgentSpawnSpec("github-copilot", sys, user);
  assert.equal(ghCopilotSpec.command, "copilot");
  assert.equal(ghCopilotSpec.args[0], "-i");
  assert.match(ghCopilotSpec.args[1]!, /sys prompt/);

  // custom agent runner
  const customSpec = getAgentSpawnSpec("my-custom-agent", sys, user);
  assert.equal(customSpec.command, "my-custom-agent");
  assert.match(customSpec.args[0]!, /sys prompt/);
});

test("getAgentSpawnSpec forwards model and effort per runner", () => {
  const sys = "sys";
  const user = "user";

  const claude = getAgentSpawnSpec("claude", sys, user, {
    model: "opus",
    effort: "high",
  });
  assert.deepEqual(claude.args, [
    "--model",
    "opus",
    "--effort",
    "high",
    "--system-prompt",
    sys,
    user,
  ]);

  const opencode = getAgentSpawnSpec("opencode", sys, user, {
    model: "anthropic/claude-sonnet-4",
    effort: "high",
  });
  assert.equal(opencode.command, "opencode");
  assert.deepEqual(opencode.args.slice(0, 6), [
    "run",
    "-i",
    "-m",
    "anthropic/claude-sonnet-4",
    "--variant",
    "high",
  ]);
  assert.match(opencode.args[6]!, /sys/);

  const agy = getAgentSpawnSpec("agy", sys, user, {
    model: "gemini-3",
    effort: "medium",
  });
  assert.deepEqual(agy.args.slice(0, 4), [
    "--model",
    "gemini-3",
    "--effort",
    "medium",
  ]);
  assert.equal(agy.args[4], "-i");

  const cursor = getAgentSpawnSpec("agent", sys, user, {
    model: "sonnet-4",
    effort: "high",
  });
  assert.deepEqual(cursor.args.slice(0, 2), [
    "--model",
    "sonnet-4[effort=high]",
  ]);

  const cursorParam = getAgentSpawnSpec("agent", sys, user, {
    model: "claude-opus-4-8[context=1m]",
    effort: "high",
  });
  assert.equal(cursorParam.args[1], "claude-opus-4-8[context=1m,effort=high]");

  const codex = getAgentSpawnSpec("codex", sys, user, {
    model: "gpt-5.6",
    effort: "high",
  });
  assert.deepEqual(codex.args, ["--model", "gpt-5.6", "--config", 'model_reasoning_effort="high"', user]);

  const copilot = getAgentSpawnSpec("copilot", sys, user, {
    model: "gpt-5.4",
    effort: "high",
  });
  assert.deepEqual(copilot.args.slice(0, 4), [
    "--model",
    "gpt-5.4",
    "--effort",
    "high",
  ]);
  assert.equal(copilot.args[4], "-i");
  assert.match(copilot.args[5]!, /sys/);

  assert.throws(
    () => getAgentSpawnSpec("agent", sys, user, { effort: "high" }),
    /requires --model/,
  );
});

test("runInit spawns specified agent runner", async () => {
  const dir = makeEmptyRepo();
  try {
    let spawnedCommand = "";
    let spawnedArgs: string[] = [];

    const mockSpawnFn = (cmd: string, args: readonly string[] = []) => {
      spawnedCommand = cmd;
      spawnedArgs = [...args];
      return { error: undefined } as any;
    };

    // Test with opencode
    await runInit({
      repoRoot: dir,
      agent: "opencode",
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(spawnedCommand, "opencode");
    assert.equal(spawnedArgs[0], "--prompt");

    // Test with agy
    await runInit({
      repoRoot: dir,
      agent: "agy",
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(spawnedCommand, "agy");
    assert.equal(spawnedArgs[0], "-i");

    // Test with agent
    await runInit({
      repoRoot: dir,
      agent: "agent",
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(spawnedCommand, "agent");

    // model + effort forwarded
    await runInit({
      repoRoot: dir,
      agent: "claude",
      model: "opus",
      effort: "xhigh",
      spawnFn: mockSpawnFn as any,
    });
    assert.equal(spawnedCommand, "claude");
    assert.deepEqual(spawnedArgs.slice(0, 4), [
      "--model",
      "opus",
      "--effort",
      "xhigh",
    ]);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit plugin format lays out a Claude Code / Cursor / Antigravity plugin bundle", async () => {
  const dir = makeEmptyRepo();
  try {
    const mockSpawnFn = () => ({ error: undefined } as any);

    await runInit({
      repoRoot: dir,
      projectName: "sample-app",
      agent: "opencode",
      spawnFn: mockSpawnFn as any,
    });

    const pluginDir = path.join(dir, ".agents", "plugins", "sample-app-plugin");

    // Antigravity manifest at the plugin root
    const agyManifest = await readJson(path.join(pluginDir, "plugin.json"));
    assert.equal(agyManifest.$schema, "https://antigravity.google/schemas/v1/plugin.json");
    assert.equal(agyManifest.name, "sample-app-plugin");
    assert.ok((await readJson(path.join(pluginDir, "mcp_config.json"))).mcpServers.context7);

    // Claude Code manifest, MCP, marketplace, and project settings enabling it
    const claudeManifest = await readJson(path.join(pluginDir, ".claude-plugin", "plugin.json"));
    assert.equal(claudeManifest.name, "sample-app-plugin");
    assert.deepEqual(claudeManifest.agents, []);
    assert.ok((await readJson(path.join(pluginDir, ".mcp.json"))).mcpServers["code-review-graph"]);
    const claudeMarket = await readJson(path.join(dir, ".claude-plugin", "marketplace.json"));
    assert.equal(claudeMarket.name, "sample-app-harness");
    assert.deepEqual(claudeMarket.plugins[0].source, "./.agents/plugins/sample-app-plugin");
    const settings = await readJson(path.join(dir, ".claude", "settings.json"));
    assert.deepEqual(settings.extraKnownMarketplaces["sample-app-harness"].source, { source: "directory", path: "." });
    assert.equal(settings.enabledPlugins["sample-app-plugin@sample-app-harness"], true);

    // Cursor manifest, MCP and marketplace
    const cursorManifest = await readJson(path.join(pluginDir, ".cursor-plugin", "plugin.json"));
    assert.deepEqual(cursorManifest.agents, []);
    assert.deepEqual(cursorManifest.rules, ["./cursor/rules/graphify.mdc", "./cursor/rules/rtk.mdc"]);
    assert.equal(cursorManifest.mcpServers, "./mcp.json");
    assert.ok((await readJson(path.join(pluginDir, "mcp.json"))).mcpServers.sequentialthinking);
    const cursorMarket = await readJson(path.join(dir, ".cursor-plugin", "marketplace.json"));
    assert.equal(cursorMarket.plugins[0].source, "./.agents/plugins/sample-app-plugin");

    // Plugin-only: no solo files for plugin-capable providers, no legacy placeholders
    assert.equal(await pathExists(path.join(dir, ".claude", "agents")), false);
    assert.equal(await pathExists(path.join(dir, ".claude", "skills")), false);
    assert.equal(await pathExists(path.join(dir, ".cursor")), false);
    assert.equal(await pathExists(path.join(dir, ".mcp.json")), false);
    assert.equal(await pathExists(path.join(dir, ".agents", "mcp.json")), false);
    assert.equal(await pathExists(path.join(pluginDir, "com.example.client")), false);

    // Skills: .agents/skills is the source, the plugin gets a copy by default
    assert.equal(await pathExists(path.join(dir, ".agents", "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(pluginDir, "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await isSymlink(path.join(pluginDir, "skills", "atomic-commits")), false);
    assert.equal(await pathExists(path.join(pluginDir, "skills", "graphify", "SKILL.md")), true);

    // MCP source of truth (AGY CLI format)
    const agyWorkspaceConfig = await readJson(path.join(dir, ".agents", "mcp_config.json"));
    assert.deepEqual(agyWorkspaceConfig.mcpServers.sequentialthinking, {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    });

    // RTK + graphify: Cursor rules ship inside the plugin
    assert.match(
      await readFile(path.join(dir, ".agents", "rules", "antigravity-rtk-rules.md"), "utf8"),
      /Rust Token Killer/,
    );
    assert.equal(await pathExists(path.join(pluginDir, "cursor", "rules", "rtk.mdc")), true);
    assert.equal(await pathExists(path.join(pluginDir, "cursor", "rules", "graphify.mdc")), true);
    assert.equal(await pathExists(path.join(dir, ".opencode", "plugins", "rtk.js")), true);
    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "graphify.md")), true);
    assert.equal(await pathExists(path.join(dir, ".agents", "workflows", "graphify.md")), true);
    assert.equal(await pathExists(path.join(dir, ".opencode", "plugins", "graphify.js")), true);
    assert.equal(await pathExists(path.join(dir, ".opencode", "opencode.json")), true);

    // Codex uses native project-agent TOML files and discovers the shared
    // .agents/skills directory directly.
    const codexContent = await readFile(path.join(dir, ".codex", "agents", "midas.toml"), "utf8");
    assert.match(codexContent, /^name = "midas"/);
    assert.match(codexContent, /developer_instructions = \"\"\"/);

    // Choices persist for later runs
    const config = await readJson(path.join(dir, ".hocus", "config.json"));
    assert.equal(config.cast, "wizard");
    assert.equal(config.format, "plugin");
    assert.equal(config.symlinks, false);
    assert.equal(config.pluginName, "sample-app-plugin");
    assert.deepEqual(config.providers, ["claude-code", "codex", "opencode", "cursor", "antigravity"]);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit solo format with symlinks links provider dirs back to .agents/", async () => {
  const dir = makeEmptyRepo();
  try {
    let spawnedArgs: string[] = [];
    const mockSpawnFn = (_cmd: string, args: readonly string[] = []) => {
      spawnedArgs = [...args];
      return { error: undefined } as any;
    };

    await runInit({
      repoRoot: dir,
      projectName: "sample-app",
      providers: ["claude-code", "cursor", "antigravity"],
      format: "solo",
      symlinks: true,
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(await pathExists(path.join(dir, ".agents", "plugins")), false);
    assert.equal(await pathExists(path.join(dir, ".claude-plugin")), false);

    for (const mirror of [".claude/skills/atomic-commits", ".cursor/skills/atomic-commits"]) {
      const full = path.join(dir, mirror);
      assert.equal(await isSymlink(full), true, `${mirror} should be a symlink`);
      assert.equal(path.isAbsolute(await readlink(full)), false, "symlinks are relative");
      assert.equal(await realpath(full), await realpath(path.join(dir, ".agents", "skills", "atomic-commits")));
    }
    assert.equal(await isSymlink(path.join(dir, ".mcp.json")), true);
    assert.equal(await isSymlink(path.join(dir, ".cursor", "mcp.json")), true);
    assert.ok((await readJson(path.join(dir, ".mcp.json"))).mcpServers.context7);
    assert.equal(await pathExists(path.join(dir, ".cursor", "rules", "rtk.mdc")), true);

    // Unselected providers get nothing
    assert.equal(await pathExists(path.join(dir, ".codex")), false);
    assert.equal(await pathExists(path.join(dir, ".opencode")), false);

    // Runner defaults to the first selected provider with a CLI
    assert.equal(spawnedArgs[0], "--system-prompt");
    const prompt = spawnedArgs.join(" ");
    assert.match(prompt, /\.claude\/agents\//);
    assert.match(prompt, /symlink/);

    // Re-running keeps links in place instead of failing on them
    await runInit({ repoRoot: dir, projectName: "sample-app", spawnFn: mockSpawnFn as any });
    assert.equal(await isSymlink(path.join(dir, ".claude", "skills", "atomic-commits")), true);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit plugin format with symlinks links plugin skills and MCP to .agents/", async () => {
  const dir = makeEmptyRepo();
  try {
    const mockSpawnFn = () => ({ error: undefined } as any);
    await runInit({
      repoRoot: dir,
      projectName: "sample-app",
      providers: ["claude-code"],
      format: "plugin",
      symlinks: true,
      spawnFn: mockSpawnFn as any,
    });

    const pluginDir = path.join(dir, ".agents", "plugins", "sample-app-plugin");
    assert.equal(await isSymlink(path.join(pluginDir, "skills", "atomic-commits")), true);
    assert.equal(await isSymlink(path.join(pluginDir, ".mcp.json")), true);
    // Only the selected provider's manifest is written
    assert.equal(await pathExists(path.join(pluginDir, ".claude-plugin", "plugin.json")), true);
    assert.equal(await pathExists(path.join(pluginDir, ".cursor-plugin")), false);
    assert.equal(await pathExists(path.join(pluginDir, "plugin.json")), false);
    // No Antigravity/Cursor/OpenCode integrations without those providers
    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "antigravity-rtk-rules.md")), false);
    assert.equal(await pathExists(path.join(dir, ".opencode")), false);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit removes legacy agent-plugins.org files", async () => {
  const dir = makeEmptyRepo();
  try {
    const pluginDir = path.join(dir, ".agents", "plugins", "sample-app-plugin");
    await outputFile(path.join(pluginDir, "com.example.client", "hooks", ".gitkeep"), "");
    await outputJson(path.join(dir, ".agents", "mcp.json"), {
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: {},
    });

    await runInit({
      repoRoot: dir,
      projectName: "sample-app",
      spawnFn: (() => ({ error: undefined })) as any,
    });

    assert.equal(await pathExists(path.join(pluginDir, "com.example.client")), false);
    assert.equal(await pathExists(path.join(dir, ".agents", "mcp.json")), false);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit with commandCode: true compiles Command Code subagents and mirrors skills", async () => {
  const dir = makeEmptyRepo();
  try {
    let spawnedArgs: string[] = [];
    const mockSpawnFn = (_cmd: string, args: readonly string[] = []) => {
      spawnedArgs = [...args];
      return { error: undefined } as any;
    };

    await runInit({
      repoRoot: dir,
      agent: "opencode",
      commandCode: true,
      spawnFn: mockSpawnFn as any,
    });

    // Subagents compiled to .commandcode/agents/ (tests default to the wizard cast)
    const cmdcAgentsDir = path.join(dir, ".commandcode", "agents");
    assert.equal(await pathExists(cmdcAgentsDir), true);
    const files = (await readdir(cmdcAgentsDir)).filter((f) => f.endsWith(".md"));
    assert.ok(files.length >= 5, `expected the compiled cast, found ${files.length}`);
    assert.ok(files.includes("midas.md"));
    assert.ok(files.includes("merlin.md"));

    const agentContent = await readFile(path.join(cmdcAgentsDir, "midas.md"), "utf8");
    assert.match(agentContent, /^---\n/);
    assert.match(agentContent, /name: midas/);
    // Midas declares tools: [read, write, bash] — mapped to Command Code tool ids
    assert.match(agentContent, /read_file, write_file, shell_command/);
    assert.match(agentContent, /Taste compatibility \(Command Code\)/);
    assert.match(agentContent, /\.commandcode\/taste\/taste\.md/);

    // Skills mirrored to .commandcode/skills/
    assert.equal(
      await pathExists(path.join(dir, ".commandcode", "skills", "atomic-commits", "SKILL.md")),
      true,
    );

    // Founder prompt carries the Command Code section
    const prompt = spawnedArgs.join(" ");
    assert.match(prompt, /\.commandcode\/agents\//);
    assert.match(prompt, /taste/);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit with commandCode: false writes no .commandcode directory", async () => {
  const dir = makeEmptyRepo();
  try {
    const mockSpawnFn = () => ({ error: undefined } as any);

    await runInit({
      repoRoot: dir,
      agent: "opencode",
      commandCode: false,
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(await pathExists(path.join(dir, ".commandcode")), false);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit installs template rules to .agents/rules/ and references them in founder prompt", async () => {
  const dir = makeEmptyRepo();
  try {
    let spawnedArgs: string[] = [];
    const mockSpawnFn = (_cmd: string, args: string[]) => {
      spawnedArgs = args;
      return { error: undefined } as any;
    };

    await runInit({
      repoRoot: dir,
      agent: "claude",
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "architecture.md")), true);
    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "commit-hygiene.md")), true);
    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "token-efficiency.md")), true);

    const prompt = spawnedArgs.join(" ");
    assert.match(prompt, /\.agents\/rules\//);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit with rules: false skips installing template rules", async () => {
  const dir = makeEmptyRepo();
  try {
    const mockSpawnFn = () => ({ error: undefined } as any);

    await runInit({
      repoRoot: dir,
      agent: "claude",
      rules: false,
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "architecture.md")), false);
    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "commit-hygiene.md")), false);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit with copilot: true compiles Copilot custom agents and mirrors skills", async () => {
  const dir = makeEmptyRepo();
  try {
    let spawnedArgs: string[] = [];
    let spawnedCmd = "";
    const mockSpawnFn = (cmd: string, args: readonly string[] = []) => {
      spawnedCmd = cmd;
      spawnedArgs = [...args];
      return { error: undefined } as any;
    };

    await runInit({
      repoRoot: dir,
      agent: "copilot",
      copilot: true,
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(spawnedCmd, "copilot");
    assert.equal(spawnedArgs[0], "-i");

    // Subagents compiled to .github/agents/
    const copilotAgentsDir = path.join(dir, ".github", "agents");
    assert.equal(await pathExists(copilotAgentsDir), true);
    const files = (await readdir(copilotAgentsDir)).filter((f) => f.endsWith(".agent.md"));
    assert.ok(files.length >= 5, `expected compiled agents, found ${files.length}`);
    assert.ok(files.includes("midas.agent.md"));
    assert.ok(files.includes("merlin.agent.md"));

    const agentContent = await readFile(path.join(copilotAgentsDir, "midas.agent.md"), "utf8");
    const { data: midasData } = matter(agentContent);
    assert.equal(midasData.name, "midas");
    // Tools mapped to Copilot aliases: read, edit, execute
    assert.deepEqual(midasData.tools, ["read", "edit", "execute"]);

    // Skills mirrored to .github/skills/
    assert.equal(
      await pathExists(path.join(dir, ".github", "skills", "atomic-commits", "SKILL.md")),
      true,
    );

    // Founder prompt carries the GitHub Copilot section
    const prompt = spawnedArgs.join(" ");
    assert.match(prompt, /\.github\/agents\//);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit with copilot: false writes no .github directory", async () => {
  const dir = makeEmptyRepo();
  try {
    const mockSpawnFn = () => ({ error: undefined } as any);

    await runInit({
      repoRoot: dir,
      agent: "claude",
      copilot: false,
      spawnFn: mockSpawnFn as any,
    });

    assert.equal(await pathExists(path.join(dir, ".github")), false);
  } finally {
    cleanupRepo(dir);
  }
});

test("runInit passes MCP configuration to agy CLI when agy is installed", async () => {
  const dir = makeEmptyRepo();
  try {
    const spawnedCalls: Array<{ cmd: string; args: string[] }> = [];
    const mockSpawnFn = (cmd: string, args: string[]) => {
      spawnedCalls.push({ cmd, args });
      if (cmd === "which" && args?.[0] === "agy") {
        return { status: 0, error: undefined } as any;
      }
      return { status: 0, error: undefined } as any;
    };

    await runInit({
      repoRoot: dir,
      projectName: "sample-app",
      agent: "agy",
      spawnFn: mockSpawnFn as any,
    });

    // Check that agy mcp add was called for configured servers
    const agyMcpCalls = spawnedCalls.filter(
      (c) => c.cmd === "agy" && c.args?.[0] === "mcp" && c.args?.[1] === "add",
    );
    assert.ok(agyMcpCalls.length >= 3, `expected at least 3 agy mcp add calls, got ${agyMcpCalls.length}`);

    const seqCall = agyMcpCalls.find((c) => c.args?.[2] === "sequentialthinking");
    assert.ok(seqCall, "expected sequentialthinking to be added to agy");
    assert.deepEqual(seqCall?.args, [
      "mcp",
      "add",
      "sequentialthinking",
      "--",
      "npx",
      "-y",
      "@modelcontextprotocol/server-sequential-thinking",
    ]);

    const crgCall = agyMcpCalls.find((c) => c.args?.[2] === "code-review-graph");
    assert.ok(crgCall, "expected code-review-graph to be added to agy");
    assert.deepEqual(crgCall?.args, [
      "mcp",
      "add",
      "code-review-graph",
      "uvx",
      "code-review-graph",
      "serve",
    ]);

    const ctx7Call = agyMcpCalls.find((c) => c.args?.[2] === "context7");
    assert.ok(ctx7Call, "expected context7 to be added to agy");
    assert.deepEqual(ctx7Call?.args, [
      "mcp",
      "add",
      "context7",
      "npx",
      "@anthropic-ai/context7",
    ]);
  } finally {
    cleanupRepo(dir);
  }
});


test("runCast after a plugin-format init compiles plugin providers into the bundle", async () => {
  const dir = makeEmptyRepo();
  try {
    await runInit({
      repoRoot: dir,
      projectName: "sample-app",
      providers: ["claude-code", "cursor", "antigravity", "codex"],
      format: "plugin",
      spawnFn: (() => ({ error: undefined })) as any,
    });
    await runCast({ repoRoot: dir });

    const pluginDir = path.join(dir, ".agents", "plugins", "sample-app-plugin");
    assert.equal(await pathExists(path.join(pluginDir, "claude", "agents", "midas.md")), true);
    assert.equal(await pathExists(path.join(pluginDir, "cursor", "agents", "midas.md")), true);
    assert.equal(await pathExists(path.join(pluginDir, "agents", "midas", "agent.md")), true);
    const claudeManifest = await readJson(path.join(pluginDir, ".claude-plugin", "plugin.json"));
    assert.ok(claudeManifest.agents.includes("./claude/agents/midas.md"));
    const cursorManifest = await readJson(path.join(pluginDir, ".cursor-plugin", "plugin.json"));
    assert.ok(cursorManifest.agents.includes("./cursor/agents/midas.md"));
    assert.equal(await pathExists(path.join(dir, ".claude", "agents")), false);
    assert.equal(await pathExists(path.join(dir, ".cursor", "agents")), false);
    assert.equal(await pathExists(path.join(dir, ".agents", "agents")), false);
    // Providers without a plugin system stay solo; unselected ones are skipped
    assert.equal(await pathExists(path.join(dir, ".codex", "agents", "midas.toml")), true);
    assert.equal(await pathExists(path.join(dir, ".opencode")), false);
  } finally {
    cleanupRepo(dir);
  }
});
