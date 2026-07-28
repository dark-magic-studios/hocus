import { test } from "node:test";
import assert from "node:assert/strict";
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

  // custom agent runner
  const customSpec = getAgentSpawnSpec("my-custom-agent", sys, user);
  assert.equal(customSpec.command, "my-custom-agent");
  assert.match(customSpec.args[0]!, /sys prompt/);
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
  } finally {
    cleanupRepo(dir);
  }
});
