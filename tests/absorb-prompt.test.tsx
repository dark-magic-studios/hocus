import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { AbsorbPrompt } from "../src/tui/components/AbsorbPrompt.js";
import type { SoulFile } from "../src/schema/soul.js";
import type { AgentGroup } from "../src/utils/absorb.js";

async function waitUntil(fn: () => boolean, timeoutMs = 1500, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

const DINESH_SOUL: SoulFile = {
  character: "dinesh",
  display_name: "Flamel",
  role: "server-dev",
  voice: "confident",
  glyph: "</>",
  triggers: ["backend"],
  sourcePath: "/tmp/dinesh.soul.md",
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

const RICHARD_SOUL: SoulFile = {
  character: "richard",
  display_name: "Merlin",
  role: "architect",
  voice: "anxious",
  glyph: "[*]",
  triggers: ["architect"],
  sourcePath: "/tmp/richard.soul.md",
  body: "Instructions",
};

test("AbsorbPrompt renders agents and supports keyboard navigation & cycling", async () => {
  let confirmedAssignments: Record<string, string> | undefined;
  let cancelled = false;

  const agentGroups: AgentGroup[] = [
    {
      id: "server-dev",
      displayName: "Flamel",
      files: [{
        id: "server-dev",
        relPath: ".claude/agents/server-dev.md",
        fullPath: "/tmp/.claude/agents/server-dev.md",
        provider: "claude-code",
        currentPersona: "dinesh",
        isStandalonePersona: false,
      }],
      currentPersona: "dinesh",
      replacementPersona: "gilfoyle",
    },
  ];

  const availablePersonas = [GILFOYLE_SOUL, RICHARD_SOUL];

  const instance = render(
    <AbsorbPrompt
      targetPersona={DINESH_SOUL}
      availablePersonas={availablePersonas}
      agentGroups={agentGroups}
      onConfirm={(res) => {
        confirmedAssignments = res;
      }}
      onCancel={() => {
        cancelled = true;
      }}
    />,
  );

  await waitUntil(() => (instance.lastFrame() ?? "").includes("Absorb Persona: Flamel"));

  const frame1 = instance.lastFrame() ?? "";
  assert.match(frame1, /server-dev/);
  assert.match(frame1, /Zoroaster \(gilfoyle\)/);

  // Press right arrow to cycle replacement from gilfoyle to richard
  instance.stdin.write("\u001B[C"); // Right arrow
  await waitUntil(() => (instance.lastFrame() ?? "").includes("Merlin (richard)"));

  // Press down arrow to move to [ Absorb ] button
  instance.stdin.write("\u001B[B"); // Down arrow
  await waitUntil(() => (instance.lastFrame() ?? "").includes("▸ [ Absorb ]"));

  // Press Enter to confirm absorption
  instance.stdin.write("\r");
  await waitUntil(() => confirmedAssignments !== undefined);

  assert.deepEqual(confirmedAssignments, {
    "server-dev": "richard",
  });

  instance.unmount();
});

test("AbsorbPrompt handles escape to cancel", async () => {
  let cancelled = false;

  const instance = render(
    <AbsorbPrompt
      targetPersona={DINESH_SOUL}
      availablePersonas={[GILFOYLE_SOUL]}
      agentGroups={[]}
      onConfirm={() => {}}
      onCancel={() => {
        cancelled = true;
      }}
    />,
  );

  await waitUntil(() => (instance.lastFrame() ?? "").includes("Absorb Persona: Flamel"));

  instance.stdin.write("\u001B"); // Escape
  await waitUntil(() => cancelled === true);

  assert.equal(cancelled, true);
  instance.unmount();
});
