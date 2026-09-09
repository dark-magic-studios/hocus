import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createCustomCast,
  getSkillIdForProjectCast,
  listAvailableCasts,
  transformSoulForProjectCast,
} from "../src/utils/cast-registry.js";
import { migrateProjectCast } from "../src/utils/cast-migrate.js";
import { CAST_MAP } from "../src/utils/cast.js";

test("createCustomCast writes JSON under .hocus/casts/", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hocus-recast-"));
  try {
    const config = await createCustomCast(dir, "cyberpunk", "Cyberpunk crew");
    assert.equal(config.label, "Cyberpunk crew");
    assert.ok(config.personas.richard);
    const file = path.join(dir, ".hocus", "casts", "cyberpunk.json");
    assert.ok(fs.existsSync(file));
    const casts = await listAvailableCasts(dir);
    assert.ok(casts.some((c) => c.id === "cyberpunk" && !c.builtin));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("transformSoulForProjectCast applies custom persona naming", () => {
  const raw = [
    "---",
    "character: merlin",
    "display_name: Merlin",
    "role: founder",
    "aliases:",
    "  valley: Richard",
    "  occult: Merlin",
    "---",
    "",
    "# Merlin — founder",
    "",
  ].join("\n");
  const custom = {
    label: "Cyber",
    personas: {
      richard: { character: "neo", display_name: "Neo" },
    },
  };
  const out = transformSoulForProjectCast(raw, "cyberpunk", custom);
  assert.match(out, /character: neo/);
  assert.match(out, /display_name: Neo/);
});

test("getSkillIdForProjectCast renames persona-bound skills for custom cast", () => {
  const custom = {
    label: "Cyber",
    personas: {
      richard: { character: "neo", display_name: "Neo" },
    },
  };
  assert.equal(
    getSkillIdForProjectCast("richard-draft-potion", "cyberpunk", custom),
    "neo-draft-potion",
  );
});

test("migrateProjectCast valley writes config and transforms richard soul", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hocus-recast-migrate-"));
  try {
    const personasDir = path.join(dir, ".hocus", "personas");
    fs.mkdirSync(personasDir, { recursive: true });
    fs.writeFileSync(
      path.join(personasDir, "merlin.soul.md"),
      [
        "---",
        "character: merlin",
        "display_name: Merlin",
        "role: founder",
        "voice: calm",
        'glyph: "[m]"',
        "triggers: []",
        "aliases:",
        "  valley: Richard",
        "  occult: Merlin",
        "---",
        "",
        "# Merlin — founder",
        "",
      ].join("\n"),
    );
    await migrateProjectCast(dir, "valley", { reinstallSkills: false });
    assert.ok(fs.existsSync(path.join(personasDir, "richard.soul.md")));
    assert.ok(!fs.existsSync(path.join(personasDir, "merlin.soul.md")));
    const config = JSON.parse(fs.readFileSync(path.join(dir, ".hocus", "config.json"), "utf8"));
    assert.equal(config.cast, "valley");
    const soul = fs.readFileSync(path.join(personasDir, "richard.soul.md"), "utf8");
    assert.match(soul, /display_name: Richard/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CAST_MAP covers all bundled persona roles", () => {
  assert.ok(CAST_MAP.richard);
  assert.ok(CAST_MAP.gilfoyle);
  assert.equal(Object.keys(CAST_MAP).length, 13);
});
