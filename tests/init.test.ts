import path from "node:path";
import fsExtra from "fs-extra";
const { pathExists, readJson, readFile, readdir } = fsExtra;
import { test } from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";
import { makeEmptyRepo, cleanupRepo } from "./tui-fixtures.js";
import { getAgentSpawnSpec, runInit } from "../src/commands/init.js";

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

test("runInit packages agent plugin, configures MCP, RTK, Graphify, and excludes Claude-specific files", async () => {
  const dir = makeEmptyRepo();
  try {
    const mockSpawnFn = () => ({ error: undefined } as any);

    await runInit({
      repoRoot: dir,
      projectName: "sample-app",
      agent: "opencode",
      spawnFn: mockSpawnFn as any,
    });

    // 1. NO claude-specific instructions or directories
    assert.equal(await pathExists(path.join(dir, "CLAUDE.md")), false);
    assert.equal(await pathExists(path.join(dir, ".claude", "agents")), false);
    assert.equal(await pathExists(path.join(dir, ".claude", "skills")), false);

    // 2. Agent plugin created following agent-plugins.org convention
    const pluginDir = path.join(dir, ".agents", "plugins", "sample-app-plugin");
    assert.equal(await pathExists(pluginDir), true);

    // plugin.json
    const manifestPath = path.join(pluginDir, "plugin.json");
    assert.equal(await pathExists(manifestPath), true);
    const manifest = await readJson(manifestPath);
    assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    assert.equal(manifest.name, "sample-app-plugin");

    // skills/ directory in plugin
    const pluginSkillsDir = path.join(pluginDir, "skills");
    assert.equal(await pathExists(pluginSkillsDir), true);
    assert.equal(await pathExists(path.join(pluginSkillsDir, "atomic-commits", "SKILL.md")), true);

    // com.example.client/hooks
    assert.equal(await pathExists(path.join(pluginDir, "com.example.client", "hooks")), true);

    // 3. mcp.json in plugin
    const mcpPath = path.join(pluginDir, "mcp.json");
    assert.equal(await pathExists(mcpPath), true);
    const mcpConfig = await readJson(mcpPath);
    assert.equal(mcpConfig.$schema, "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
    assert.deepEqual(mcpConfig.mcpServers.sequentialthinking, {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      type: "stdio",
    });
    assert.deepEqual(mcpConfig.mcpServers["code-review-graph"], {
      command: "uvx",
      args: ["code-review-graph", "serve"],
      type: "stdio",
    });
    assert.deepEqual(mcpConfig.mcpServers.context7, {
      command: "npx",
      args: ["@anthropic-ai/context7"],
      type: "stdio",
    });

    // 4. RTK installed on all providers
    // Antigravity rule
    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "antigravity-rtk-rules.md")), true);
    const rtkAntigravityContent = await readFile(path.join(dir, ".agents", "rules", "antigravity-rtk-rules.md"), "utf8");
    assert.match(rtkAntigravityContent, /Rust Token Killer/);

    // Cursor rule
    assert.equal(await pathExists(path.join(dir, ".cursor", "rules", "rtk.mdc")), true);

    // OpenCode plugin
    assert.equal(await pathExists(path.join(dir, ".opencode", "plugins", "rtk.js")), true);

    // 5. Graphify installed on all providers
    // Antigravity rules & workflows
    assert.equal(await pathExists(path.join(dir, ".agents", "rules", "graphify.md")), true);
    assert.equal(await pathExists(path.join(dir, ".agents", "workflows", "graphify.md")), true);

    // Cursor rule
    assert.equal(await pathExists(path.join(dir, ".cursor", "rules", "graphify.mdc")), true);

    // OpenCode plugin & config
    assert.equal(await pathExists(path.join(dir, ".opencode", "plugins", "graphify.js")), true);
    assert.equal(await pathExists(path.join(dir, ".opencode", "opencode.json")), true);

    // Graphify skill installed in plugin and .agents/skills
    assert.equal(await pathExists(path.join(pluginSkillsDir, "graphify", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(dir, ".agents", "skills", "graphify", "SKILL.md")), true);

    // Codex uses native project-agent TOML files and discovers the shared
    // .agents/skills directory directly.
    const codexAgent = path.join(dir, ".codex", "agents", "midas.toml");
    assert.equal(await pathExists(codexAgent), true);
    const codexContent = await readFile(codexAgent, "utf8");
    assert.match(codexContent, /^name = "midas"/);
    assert.match(codexContent, /developer_instructions = \"\"\"/);
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

