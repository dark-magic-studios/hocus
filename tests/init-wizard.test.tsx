import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { InitWizard, wizardSteps, type InitWizardAnswers } from "../src/tui/components/InitWizard.js";

async function waitUntil(fn: () => boolean, timeoutMs = 1500, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

const initial: InitWizardAnswers = {
  cast: "wizard",
  providers: ["claude-code", "codex", "opencode", "cursor", "antigravity"],
  format: "plugin",
  symlinks: true,
  runner: "claude",
};

const DOWN = "\u001B[B";
const ESC = "\u001B";

test("wizardSteps skips locked steps and the format step without plugin providers", () => {
  assert.deepEqual(wizardSteps(initial), ["cast", "providers", "format", "symlinks", "runner", "summary"]);
  assert.deepEqual(wizardSteps({ ...initial, providers: ["codex"], runner: "codex" }), [
    "cast",
    "providers",
    "symlinks",
    "summary",
  ]);
  assert.deepEqual(wizardSteps(initial, { cast: true, runner: true }), ["providers", "format", "symlinks", "summary"]);
});

test("InitWizard walks every step and returns the answers", async () => {
  let result: InitWizardAnswers | undefined;
  const instance = render(
    <InitWizard
      initial={initial}
      pluginName="sample-app-plugin"
      detected={["cursor"]}
      onDone={(answers) => {
        result = answers;
      }}
      onCancel={() => assert.fail("should not cancel")}
    />,
  );
  const frame = () => instance.lastFrame() ?? "";
  const press = async (key: string, until: () => boolean) => {
    instance.stdin.write(key);
    await waitUntil(until);
  };

  await waitUntil(() => frame().includes("naming convention"));
  // cast: move to Silicon Valley
  await press(DOWN, () => frame().includes("› Silicon Valley"));
  await press("\r", () => frame().includes("Which providers"));

  // providers: detected tag, untick Claude Code, tick Command Code
  assert.match(frame(), /Cursor.*detected/);
  await press(" ", () => frame().includes("[ ] Claude Code"));
  for (const label of ["Codex", "OpenCode", "Cursor", "Antigravity", "Command Code"]) {
    await press(DOWN, () => new RegExp(`› \\[.\\] ${label}`).test(frame()));
  }
  await press(" ", () => frame().includes("[x] Command Code"));
  await press("\r", () => frame().includes("plugin or solo"));

  // format: solo
  await press(DOWN, () => frame().includes("› Solo"));
  await press("\r", () => frame().includes("Symlink provider files"));

  // symlinks: keep yes
  await press("\r", () => frame().includes("founder session"));

  // runner: Claude is no longer selected, so the first runner is Codex
  assert.doesNotMatch(frame(), /Claude Code \(claude\)/);
  assert.match(frame(), /› Codex \(codex\)/);
  await press(DOWN, () => frame().includes("› OpenCode (opencode)"));
  await press("\r", () => frame().includes("Ready to cast"));

  assert.match(frame(), /\.cursor\/skills/);
  assert.match(frame(), /\.commandcode\/skills/);
  await press("\r", () => result !== undefined);

  assert.deepEqual(result, {
    cast: "valley",
    providers: ["codex", "opencode", "cursor", "antigravity", "command-code"],
    format: "solo",
    symlinks: true,
    runner: "opencode",
  });
  instance.unmount();
});

test("InitWizard requires at least one provider, goes back with Esc and cancels from the first step", async () => {
  let cancelled = false;
  const instance = render(
    <InitWizard
      initial={{ ...initial, providers: ["codex"], runner: "codex" }}
      locked={{ cast: true }}
      pluginName="sample-app-plugin"
      onDone={() => assert.fail("should not finish")}
      onCancel={() => {
        cancelled = true;
      }}
    />,
  );
  const frame = () => instance.lastFrame() ?? "";

  await waitUntil(() => frame().includes("Which providers"));
  instance.stdin.write(DOWN);
  await waitUntil(() => frame().includes("› [x] Codex"));
  instance.stdin.write(" ");
  await waitUntil(() => frame().includes("[ ] Codex"));
  instance.stdin.write("\r");
  await waitUntil(() => frame().includes("select at least one provider"));

  instance.stdin.write(" ");
  await waitUntil(() => frame().includes("[x] Codex"));
  instance.stdin.write("\r");
  // No plugin-capable provider selected: the format step is skipped
  await waitUntil(() => frame().includes("Symlink provider files"));
  instance.stdin.write(ESC);
  await waitUntil(() => frame().includes("Which providers"));
  instance.stdin.write(ESC);
  await waitUntil(() => cancelled);
  instance.unmount();
});
