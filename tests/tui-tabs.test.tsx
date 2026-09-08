import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { DeckProvider } from "../src/tui/state/DeckContext.js";
import { PotionsTab } from "../src/tui/tabs/PotionsTab.js";
import { SpellsTab } from "../src/tui/tabs/SpellsTab.js";
import { SoulsTab } from "../src/tui/tabs/SoulsTab.js";
import { CovenTab } from "../src/tui/tabs/CovenTab.js";
import { GrimoireTab } from "../src/tui/tabs/GrimoireTab.js";
import { ScryingTab } from "../src/tui/tabs/ScryingTab.js";
import { makeEmptyRepo, makePopulatedRepo, cleanupRepo } from "./tui-fixtures.js";

async function waitUntil(fn: () => boolean, timeoutMs = 1500, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

const TABS: Array<{ name: string; Tab: React.ComponentType; emptyText: string; populatedText: string }> = [
  { name: "PotionsTab", Tab: PotionsTab, emptyText: "no potions in", populatedText: "Test Feature" },
  { name: "SpellsTab", Tab: SpellsTab, emptyText: "no spells in", populatedText: "test-spell" },
  { name: "SoulsTab", Tab: SoulsTab, emptyText: "no souls bound", populatedText: "Test Agent" },
  { name: "CovenTab", Tab: CovenTab, emptyText: "coven is empty", populatedText: "Test Agent" },
  { name: "GrimoireTab", Tab: GrimoireTab, emptyText: "grimoire is empty", populatedText: "test-skill" },
  { name: "ScryingTab", Tab: ScryingTab, emptyText: "no activity recorded", populatedText: "test-agent" },
];

for (const { name, Tab, emptyText, populatedText } of TABS) {
  test(`${name} renders the empty state without throwing`, async () => {
    const dir = makeEmptyRepo();
    try {
      const instance = render(
        <DeckProvider cwd={dir}>
          <Tab />
        </DeckProvider>,
      );
      await waitUntil(() => (instance.lastFrame() ?? "").length > 0);
      assert.match(instance.lastFrame() ?? "", new RegExp(emptyText));
      instance.unmount();
    } finally {
      cleanupRepo(dir);
    }
  });

  test(`${name} renders the populated state without throwing`, async () => {
    const dir = makePopulatedRepo();
    try {
      const instance = render(
        <DeckProvider cwd={dir}>
          <Tab />
        </DeckProvider>,
      );
      await waitUntil(() => (instance.lastFrame() ?? "").includes(populatedText));
      assert.match(instance.lastFrame() ?? "", new RegExp(populatedText));
      instance.unmount();
    } finally {
      cleanupRepo(dir);
    }
  });
}
