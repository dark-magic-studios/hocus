import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { ProviderSelectPrompt } from "../src/tui/components/ProviderSelectPrompt.js";
import type { TargetId } from "../src/compilers/types.js";

async function waitUntil(fn: () => boolean, timeoutMs = 1500, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test("ProviderSelectPrompt renders checkmarks and handles keyboard interaction", async () => {
  let selectedResult: TargetId[] | undefined;
  const instance = render(
    <ProviderSelectPrompt
      onSelect={(res) => {
        selectedResult = res;
      }}
    />
  );

  await waitUntil(() => (instance.lastFrame() ?? "").includes("Select target providers"));

  const frame = instance.lastFrame() ?? "";
  assert.match(frame, /Claude Code/);
  assert.match(frame, /Codex/);
  assert.match(frame, /OpenCode/);
  assert.match(frame, /Cursor/);
  assert.match(frame, /Antigravity/);
  assert.match(frame, /Command Code/);
  assert.match(frame, /GitHub Copilot/);
  assert.match(frame, /\[x\] Claude Code/);

  // Press space to toggle first item off
  instance.stdin.write(" ");
  await waitUntil(() => (instance.lastFrame() ?? "").includes("[ ] Claude Code"));

  // Press return to confirm
  instance.stdin.write("\r");
  await waitUntil(() => selectedResult !== undefined);

  assert.deepEqual(selectedResult, ["codex", "opencode", "cursor", "antigravity", "command-code", "copilot"]);
  instance.unmount();
});
