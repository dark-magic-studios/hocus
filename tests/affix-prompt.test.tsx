import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { AffixPrompt } from "../src/tui/components/AffixPrompt.js";
import type { SoulFile } from "../src/schema/soul.js";
import type { DetectedSubagent } from "../src/utils/affix.js";

async function waitUntil(fn: () => boolean, timeoutMs = 1500, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

const JARED_SOUL: SoulFile = {
  character: "jared",
  display_name: "Roger Bacon",
  role: "orchestrator",
  voice: "warm",
  glyph: "[*]",
  triggers: ["orchestrate"],
  sourcePath: "/tmp/jared.soul.md",
  body: "Instructions",
};

const GILFOYLE_SOUL: SoulFile = {
  character: "gilfoyle",
  display_name: "Zoroaster",
  role: "reviewer",
  voice: "cold",
  glyph: "(o)",
  triggers: ["review"],
  sourcePath: "/tmp/gilfoyle.soul.md",
  body: "Instructions",
};

test("AffixPrompt renders one entry per file and supports keyboard navigation & cycling souls", async () => {
  let confirmedAssignments: Record<string, string> | undefined;
  let cancelled = false;

  const subagentFiles: DetectedSubagent[] = [
    {
      id: "orchestrator",
      displayName: "Custom Orchestrator",
      filePath: "/repo/.cursor/agents/orchestrator.md",
      relPath: ".cursor/agents/orchestrator.md",
      provider: "cursor",
    },
    {
      id: "orchestrator",
      displayName: "Custom Orchestrator",
      filePath: "/repo/.claude/agents/orchestrator.md",
      relPath: ".claude/agents/orchestrator.md",
      provider: "claude-code",
    },
  ];

  const availableSouls = [JARED_SOUL, GILFOYLE_SOUL];

  const instance = render(
    <AffixPrompt
      availableSouls={availableSouls}
      subagentFiles={subagentFiles}
      onConfirm={(res) => {
        confirmedAssignments = res;
      }}
      onCancel={() => {
        cancelled = true;
      }}
    />,
  );

  await waitUntil(() => (instance.lastFrame() ?? "").includes("Affix Hocus Souls to Subagents"));

  const frame1 = instance.lastFrame() ?? "";
  // Check both file paths appear as distinct entries
  assert.match(frame1, /\.cursor\/agents\/orchestrator\.md/);
  assert.match(frame1, /\.claude\/agents\/orchestrator\.md/);

  // Cycle soul right for first file -> Roger Bacon (jared)
  instance.stdin.write("\u001B[C"); // Right arrow
  await waitUntil(() => (instance.lastFrame() ?? "").includes("Roger Bacon (jared)"));

  // Move down to second file
  instance.stdin.write("\u001B[B"); // Down arrow
  await waitUntil(() => (instance.lastFrame() ?? "").includes("▸ .claude/agents/orchestrator.md"));

  // Cycle soul right twice for second file -> Zoroaster (gilfoyle)
  instance.stdin.write("\u001B[C");
  await waitUntil(() => (instance.lastFrame() ?? "").includes("Roger Bacon (jared)"));
  instance.stdin.write("\u001B[C");
  await waitUntil(() => (instance.lastFrame() ?? "").includes("Zoroaster (gilfoyle)"));

  // Press down arrow to move to [ Affix Souls ] button
  instance.stdin.write("\u001B[B"); // Down arrow
  await waitUntil(() => (instance.lastFrame() ?? "").includes("▸ [ Affix Souls ]"));

  // Press Enter to confirm
  instance.stdin.write("\r");
  await waitUntil(() => confirmedAssignments !== undefined);

  assert.deepEqual(confirmedAssignments, {
    ".cursor/agents/orchestrator.md": "jared",
    ".claude/agents/orchestrator.md": "gilfoyle",
  });

  instance.unmount();
});

test("AffixPrompt handles escape to cancel", async () => {
  let cancelled = false;

  const instance = render(
    <AffixPrompt
      availableSouls={[JARED_SOUL]}
      subagentFiles={[]}
      onConfirm={() => {}}
      onCancel={() => {
        cancelled = true;
      }}
    />,
  );

  await waitUntil(() => (instance.lastFrame() ?? "").includes("Affix Hocus Souls to Subagents"));

  instance.stdin.write("\u001B"); // Escape
  await waitUntil(() => cancelled === true);

  assert.equal(cancelled, true);
  instance.unmount();
});
