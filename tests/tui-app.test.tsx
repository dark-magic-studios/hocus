import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { App } from "../src/tui/App.js";
import { makeEmptyRepo, cleanupRepo } from "./tui-fixtures.js";

async function waitUntil(fn: () => boolean, timeoutMs = 1500, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test("App boots straight to the potions tab when silentBoot is set", async () => {
  const dir = makeEmptyRepo();
  try {
    const instance = render(
      <App cwd={dir} version="0.0.0-test" silentBoot bootTasks={[]} />,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[potions]"));
    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("App switches tabs by digit index", async () => {
  const dir = makeEmptyRepo();
  try {
    const instance = render(
      <App cwd={dir} version="0.0.0-test" silentBoot bootTasks={[]} />,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[potions]"));

    instance.stdin.write("2");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[souls]"));
    assert.match(instance.lastFrame() ?? "", /\[souls]/);

    instance.stdin.write("4");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[grimoire]"));
    assert.match(instance.lastFrame() ?? "", /\[grimoire]/);

    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});

test("App switches tabs with tab and shift-tab", async () => {
  const dir = makeEmptyRepo();
  try {
    const instance = render(
      <App cwd={dir} version="0.0.0-test" silentBoot bootTasks={[]} />,
    );
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[potions]"));

    instance.stdin.write("\t");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[souls]"));
    assert.match(instance.lastFrame() ?? "", /\[souls]/);

    instance.stdin.write("[Z");
    await waitUntil(() => (instance.lastFrame() ?? "").includes("[potions]"));
    assert.match(instance.lastFrame() ?? "", /\[potions]/);

    instance.unmount();
  } finally {
    cleanupRepo(dir);
  }
});
