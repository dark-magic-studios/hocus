import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { initializeAgentPlugin, installGraphify } from "../src/utils/plugin.js";
import type { HarnessChoices } from "../src/utils/harness.js";

// Stub: every `which` lookup fails, so no real agy/rtk/graphify ever runs.
const spawnFn = (() => ({ status: 1 })) as any;

const origLog = console.log;
let logged: string[] = [];
beforeEach(() => {
  logged = [];
  console.log = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  };
});
afterEach(() => {
  console.log = origLog;
});

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hocus-plugin-test-"));
}

function writeFile(dir: string, rel: string, content: string): void {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function readJson(dir: string, rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8"));
}

/** Snapshot of every file under dir (relative path → contents). */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rel of fs.readdirSync(dir, { recursive: true }) as string[]) {
    const full = path.join(dir, rel);
    if (fs.statSync(full).isFile()) out[rel] = fs.readFileSync(full, "utf8");
  }
  return out;
}

const choices: HarnessChoices = {
  providers: ["antigravity", "claude-code", "cursor"],
  format: "plugin",
  symlinks: false,
  pluginName: "sample-plugin",
};

test("initializeAgentPlugin preserves user MCP servers and top-level keys", async () => {
  const dir = makeTmpDir();
  try {
    const custom = { command: "node", args: ["my-server.js"] };
    const userContext7 = { command: "my-context7" };
    writeFile(
      dir,
      ".agents/mcp_config.json",
      JSON.stringify({ customKey: 42, mcpServers: { "my-server": custom, context7: userContext7 } }),
    );

    await initializeAgentPlugin(dir, choices, { spawnFn });

    const config = readJson(dir, ".agents/mcp_config.json");
    assert.equal(config.customKey, 42, "lost top-level key");
    assert.deepEqual(config.mcpServers["my-server"], custom, "lost custom server");
    assert.deepEqual(config.mcpServers.context7, userContext7, "user entry must win");
    assert.ok(config.mcpServers.sequentialthinking, "missing hocus default");
    assert.ok(config.mcpServers["code-review-graph"], "missing hocus default");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("initializeAgentPlugin leaves unparseable canonical mcp_config.json byte-identical and warns", async () => {
  const dir = makeTmpDir();
  try {
    const broken = '{ "mcpServers": { "oops": , }\n';
    writeFile(dir, ".agents/mcp_config.json", broken);

    await initializeAgentPlugin(dir, choices, { spawnFn });

    assert.equal(fs.readFileSync(path.join(dir, ".agents", "mcp_config.json"), "utf8"), broken);
    assert.ok(
      logged.some((line) => line.includes(path.join(".agents", "mcp_config.json"))),
      "expected a warning naming .agents/mcp_config.json",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("initializeAgentPlugin warns on unparseable root mcp_config.json", async () => {
  const dir = makeTmpDir();
  try {
    writeFile(dir, "mcp_config.json", "not json");
    await initializeAgentPlugin(dir, choices, { spawnFn });
    assert.ok(logged.some((line) => line.includes("mcp_config.json")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("initializeAgentPlugin + installGraphify are idempotent", async () => {
  const dir = makeTmpDir();
  try {
    writeFile(dir, ".agents/mcp_config.json", JSON.stringify({ mcpServers: { mine: { command: "x" } } }));
    writeFile(dir, ".opencode/opencode.json", JSON.stringify({ theme: "dark", plugin: ["./plugins/other.js"] }));

    const run = async () => {
      await initializeAgentPlugin(dir, choices, { spawnFn });
      await installGraphify(dir, { spawnFn });
    };

    await run();
    const first = snapshot(dir);
    await run();
    const second = snapshot(dir);

    assert.deepEqual(second, first);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("no written config references the nonexistent @anthropic-ai/context7 package", async () => {
  const dir = makeTmpDir();
  try {
    // A stale config written by an older hocus is migrated too.
    writeFile(
      dir,
      ".agents/mcp_config.json",
      JSON.stringify({ mcpServers: { context7: { command: "npx", args: ["@anthropic-ai/context7"] } } }),
    );

    await initializeAgentPlugin(dir, choices, { spawnFn });
    await installGraphify(dir, { spawnFn });

    const files = snapshot(dir);
    for (const [rel, content] of Object.entries(files)) {
      if (rel.endsWith(".json")) {
        assert.ok(!content.includes("@anthropic-ai/context7"), `${rel} references @anthropic-ai/context7`);
      }
    }
    assert.deepEqual(readJson(dir, ".agents/mcp_config.json").mcpServers.context7, {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("installGraphify preserves existing opencode.json keys and appends plugin once", async () => {
  const dir = makeTmpDir();
  try {
    writeFile(
      dir,
      ".opencode/opencode.json",
      JSON.stringify({ $schema: "https://opencode.ai/config.json", model: "x/y", plugin: ["./plugins/other.js"] }),
    );

    await installGraphify(dir, { spawnFn });
    await installGraphify(dir, { spawnFn });

    const config = readJson(dir, ".opencode/opencode.json");
    assert.equal(config.$schema, "https://opencode.ai/config.json");
    assert.equal(config.model, "x/y");
    assert.deepEqual(config.plugin, ["./plugins/other.js", "./plugins/graphify.js"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("installGraphify leaves unparseable opencode.json byte-identical", async () => {
  const dir = makeTmpDir();
  try {
    const broken = "{ plugin: [";
    writeFile(dir, ".opencode/opencode.json", broken);

    await installGraphify(dir, { spawnFn });

    assert.equal(fs.readFileSync(path.join(dir, ".opencode", "opencode.json"), "utf8"), broken);
    assert.ok(logged.some((line) => line.includes("opencode.json")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("dryRun writes no MCP or opencode config files", async () => {
  const dir = makeTmpDir();
  try {
    await initializeAgentPlugin(dir, choices, { dryRun: true, spawnFn });
    await installGraphify(dir, { dryRun: true, spawnFn });
    assert.deepEqual(snapshot(dir), {});
    assert.ok(logged.some((line) => line.includes("mcp_config.json")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
