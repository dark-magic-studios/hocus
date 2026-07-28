import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import React from "react";
import { render } from "ink-testing-library";
import { DeckProvider } from "../src/tui/state/DeckContext.js";
import { SeanceTab } from "../src/tui/tabs/SeanceTab.js";
import type { SpawnFn } from "../src/tui/chat/runBackend.js";
import { makeEmptyRepo, makePopulatedRepo, cleanupRepo } from "./tui-fixtures.js";

async function waitUntil(fn: () => boolean, timeoutMs = 2000, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function addSecondAgent(dir: string): void {
  fs.writeFileSync(
    path.join(dir, ".hocus", "personas", "z-second-agent.soul.md"),
    [
      "---",
      "character: second-agent",
      "display_name: Second Agent",
      "role: reviewer",
      "voice: calm",
      'glyph: "[s]"',
      "triggers: []",
      "---",
      "",
      "Body.",
      "",
    ].join("\n"),
  );
}

// Fakes node:child_process's spawn shape closely enough for runBackend:
// stdout/stderr as event emitters, plus 'error'/'close' on the child itself.
function fakeSpawn(output: string, opts: { fail?: boolean } = {}): SpawnFn {
  return ((_cmd: string, _args: string[], _spawnOpts: unknown) => {
    const child = new EventEmitter() as unknown as {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: () => void;
    } & EventEmitter;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => child.emit("close", 1);
    process.nextTick(() => {
      if (opts.fail) {
        child.stderr.emit("data", Buffer.from("boom"));
        child.emit("close", 1);
      } else {
        child.stdout.emit("data", Buffer.from(output));
        child.emit("close", 0);
      }
    });
    return child;
  }) as unknown as SpawnFn;
}

test("SeanceTab renders branding, model, and agent lines without throwing", async () => {
  const dir = makeEmptyRepo();
  try {
    const instance = render(
      <DeckProvider cwd={dir}>
        <SeanceTab />
      </DeckProvider>,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("hocus"));
    const frame = instance.lastFrame() ?? "";
    assert.match(frame, /model/);
    assert.match(frame, /claude -p/);
    assert.match(frame, /agent/);
    assert.match(frame, /none bound/);
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("ctrl+b cycles the backend shown on the model line", async () => {
  const dir = makeEmptyRepo();
  try {
    const instance = render(
      <DeckProvider cwd={dir}>
        <SeanceTab />
      </DeckProvider>,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("claude -p"));
    instance.stdin.write(""); // ctrl+b
    await waitUntil(() => (instance.lastFrame() ?? "").includes("opencode -p"));
    assert.match(instance.lastFrame() ?? "", /opencode -p/);
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("tab cycles the bound agent", async () => {
  const dir = makePopulatedRepo();
  addSecondAgent(dir);
  try {
    const instance = render(
      <DeckProvider cwd={dir}>
        <SeanceTab />
      </DeckProvider>,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("Test Agent"));
    instance.stdin.write("\t");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("Second Agent"));
    assert.match(instance.lastFrame() ?? "", /Second Agent/);
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("typing / surfaces both bundled skills and hocus's own builtin commands", async () => {
  const dir = makePopulatedRepo();
  try {
    const instance = render(
      <DeckProvider cwd={dir}>
        <SeanceTab />
      </DeckProvider>,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("hocus"));
    instance.stdin.write("/sy");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("/sync"));
    assert.match(instance.lastFrame() ?? "", /\/sync/);
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("typing @ surfaces repo files for mentioning", async () => {
  const dir = makePopulatedRepo();
  try {
    const instance = render(
      <DeckProvider cwd={dir}>
        <SeanceTab />
      </DeckProvider>,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("hocus"));
    instance.stdin.write("@test-spell");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("test-spell.md"), 4000);
    assert.match(instance.lastFrame() ?? "", /test-spell\.md/);
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("sending a message runs it through the selected backend and shows the reply", async () => {
  const dir = makeEmptyRepo();
  try {
    const instance = render(
      <DeckProvider cwd={dir}>
        <SeanceTab spawnImpl={fakeSpawn("mocked reply text")} />
      </DeckProvider>,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("hocus"));
    instance.stdin.write("hello there");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("hello there"));
    instance.stdin.write("\r");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("mocked reply text"));
    const frame = instance.lastFrame() ?? "";
    assert.match(frame, /hello there/);
    assert.match(frame, /mocked reply text/);
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("a /sync command runs in-process and reports its own output, not a backend reply", async () => {
  const dir = makePopulatedRepo();
  try {
    const instance = render(
      <DeckProvider cwd={dir}>
        <SeanceTab spawnImpl={fakeSpawn("should never be used")} />
      </DeckProvider>,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("hocus"));
    instance.stdin.write("/sync");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("/sync"));
    instance.stdin.write("\r"); // accept the /sync suggestion (value becomes "/sync ")
    await waitUntil(() => (instance.lastFrame() ?? "").includes("> /sync"));
    instance.stdin.write("\r"); // submit for real
    await waitUntil(() => (instance.lastFrame() ?? "").includes("dashboard.html refreshed"), 4000);
    const frame = instance.lastFrame() ?? "";
    assert.match(frame, /dashboard\.html refreshed/);
    assert.doesNotMatch(frame, /should never be used/);
    assert.ok(fs.existsSync(path.join(dir, "dashboard.html")));
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});
