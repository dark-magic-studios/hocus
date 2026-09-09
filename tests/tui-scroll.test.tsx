import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { App } from "../src/tui/App.js";
import { cleanupRepo } from "./tui-fixtures.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function waitUntil(fn: () => boolean, timeoutMs = 5000, intervalMs = 30): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function makeScrollRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hocus-scroll-test-"));
  fs.mkdirSync(path.join(dir, ".hocus", "_spells", "incantations"), { recursive: true });
  for (let i = 0; i < 30; i++) {
    const name = `spell-${String(i).padStart(2, "0")}`;
    fs.writeFileSync(
      path.join(dir, ".hocus", "_spells", "incantations", `${name}.md`),
      ["---", `name: ${name}`, "type: incantation", "---", "", "body", ""].join("\n"),
    );
  }
  fs.mkdirSync(path.join(dir, ".claude", "skills"), { recursive: true });
  for (let i = 0; i < 30; i++) {
    const name = `skill-${String(i).padStart(2, "0")}`;
    const skillDir = path.join(dir, ".claude", "skills", name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      ["---", `name: ${name}`, `description: Skill ${i}`, "---", "", "body", ""].join("\n"),
    );
  }
  return dir;
}

test("SpellsTab keeps the first item visible and scrolls on arrow down", async () => {
  const dir = makeScrollRepo();
  try {
    const instance = render(
      <App cwd={dir} version="0.0.0-test" silentBoot bootTasks={[]} />,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[potions]"));

    instance.stdin.write("2");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("spell-00"));

    const initial = instance.lastFrame() ?? "";
    assert.match(initial, /▸ \[incantation\] spell-00/);
    assert.match(initial, /1-\d+ of \d+/);

    for (let i = 0; i < 15; i++) instance.stdin.write("\u001b[B");
    await waitUntil(() => !(instance.lastFrame() ?? "").includes("▸ [incantation] spell-00"));

    const scrolled = instance.lastFrame() ?? "";
    assert.doesNotMatch(scrolled, /▸ \[incantation\] spell-00/);
    assert.match(scrolled, /\d+-\d+ of \d+/);

    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("GrimoireTab keeps the first item visible and scrolls on arrow down", async () => {
  const dir = makeScrollRepo();
  try {
    const instance = render(
      <App cwd={dir} version="0.0.0-test" silentBoot bootTasks={[]} />,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[potions]"));

    instance.stdin.write("5");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("skill-00"));

    const initial = instance.lastFrame() ?? "";
    assert.match(initial, /▸ \[local\].*skill-00/);
    assert.match(initial, /1-\d+ of \d+/);

    for (let i = 0; i < 12; i++) instance.stdin.write("\u001b[B");
    await waitUntil(() => !(instance.lastFrame() ?? "").includes("▸ [local]") || !(instance.lastFrame() ?? "").includes("skill-00"));

    const scrolled = instance.lastFrame() ?? "";
    assert.doesNotMatch(scrolled, /▸ \[local\].*skill-00/);
    assert.match(scrolled, /\d+-\d+ of \d+/);

    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});
