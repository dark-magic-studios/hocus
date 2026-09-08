import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadDeck } from "../src/tui/state/loadDeck.js";
import { makeEmptyRepo, makePopulatedRepo, cleanupRepo } from "./tui-fixtures.js";

function writeSoul(dir: string, filename: string, contents: string): void {
  fs.mkdirSync(path.join(dir, ".hocus", "personas"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".hocus", "personas", filename), contents);
}

test("empty repo loads a fully empty, error-free deck", async () => {
  const dir = makeEmptyRepo();
  try {
    const deck = await loadDeck(dir);
    assert.deepEqual(deck.agents, []);
    assert.deepEqual(deck.potions, []);
    assert.deepEqual(deck.ledger, []);
    assert.deepEqual(deck.warnings, []);
    // BUNDLED_SKILLS_DIR resolves to this package's own src/templates/skills/, not the
    // fixture cwd, so an "empty project" still surfaces the bundled roster.
    assert.ok(deck.skills.length > 0);
    assert.ok(deck.skills.every((s) => s.source === "bundled"));
    assert.ok(deck.wards.length > 0, "wards should still enumerate all five compiler targets");
    assert.ok(deck.wards.some((w) => w.target === "command-code"));
    assert.ok(deck.wards.every((w) => w.detected === false));
  } finally {
    cleanupRepo(dir);
  }
});

test("a malformed SOUL.md produces a warning instead of throwing", async () => {
  const dir = makeEmptyRepo();
  try {
    writeSoul(dir, "broken.soul.md", "---\nrole: missing everything else\n---\nbody\n");
    const deck = await loadDeck(dir);
    assert.deepEqual(deck.agents, []);
    assert.ok(deck.warnings.some((w) => w.includes("malformed SOUL.md")));
  } finally {
    cleanupRepo(dir);
  }
});

test("an agent whose parent is missing becomes an orphan, not a crash", async () => {
  const dir = makeEmptyRepo();
  try {
    writeSoul(
      dir,
      "orphan.soul.md",
      [
        "---",
        "character: orphan",
        "display_name: Orphan",
        "role: familiar",
        "voice: lost",
        'glyph: "[o]"',
        "parent: nobody-home",
        "triggers: []",
        "---",
        "",
        "body",
        "",
      ].join("\n"),
    );
    const deck = await loadDeck(dir);
    assert.equal(deck.agents.length, 1);
    assert.equal(deck.agents[0]?.parentId, "nobody-home");
    assert.ok(deck.warnings.some((w) => w.includes("orphaned agent")));
  } finally {
    cleanupRepo(dir);
  }
});

test("a circular parent chain is detected and broken instead of hanging", async () => {
  const dir = makeEmptyRepo();
  try {
    writeSoul(
      dir,
      "a.soul.md",
      ["---", "character: a", "display_name: A", "role: r", "voice: v", 'glyph: "[a]"', "parent: b", "triggers: []", "---", "", "body", ""].join("\n"),
    );
    writeSoul(
      dir,
      "b.soul.md",
      ["---", "character: b", "display_name: B", "role: r", "voice: v", 'glyph: "[b]"', "parent: a", "triggers: []", "---", "", "body", ""].join("\n"),
    );
    const deck = await loadDeck(dir);
    assert.equal(deck.agents.length, 2);
    assert.ok(deck.warnings.some((w) => w.includes("circular parent reference")));
    // at least one side of the cycle must have been broken (parentId cleared)
    assert.ok(deck.agents.some((a) => a.parentId === undefined));
  } finally {
    cleanupRepo(dir);
  }
});

test("a malformed ledger line is skipped with a warning, valid lines still parse", async () => {
  const dir = makeEmptyRepo();
  try {
    fs.mkdirSync(path.join(dir, ".hocus"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".hocus", "ledger.jsonl"),
      [
        JSON.stringify({ at: "1", agentId: "a", event: "e", tokensIn: 1, tokensOut: 2, costUsd: 0.001 }),
        "not json at all",
        JSON.stringify({ at: "2", agentId: "b" }), // missing required fields
      ].join("\n"),
    );
    const deck = await loadDeck(dir);
    assert.equal(deck.ledger.length, 1);
    assert.ok(deck.warnings.filter((w) => w.includes("malformed ledger line")).length >= 2);
  } finally {
    cleanupRepo(dir);
  }
});

test("populated repo loads real counts across every section", async () => {
  const dir = makePopulatedRepo();
  try {
    const deck = await loadDeck(dir);
    assert.equal(deck.agents.length, 1);
    assert.equal(deck.potions.length, 1);
    assert.equal(deck.ledger.length, 1);
    const localSkill = deck.skills.find((s) => s.id === "test-skill");
    assert.equal(localSkill?.source, "local");
    assert.ok(deck.wards.some((w) => w.target === "claude-code" && w.detected));
  } finally {
    cleanupRepo(dir);
  }
});
