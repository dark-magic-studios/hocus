import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeEmptyRepo, cleanupRepo } from "./tui-fixtures.js";
import { readSpells, writeSpellsManifest } from "../src/schema/spell.js";
import { installSpells } from "../src/commands/init.js";
import { PROJECT_SPELLS_DIR } from "../src/utils/paths.js";

test("readSpells returns empty array for non-existent or empty directory", async () => {
  const dir = makeEmptyRepo();
  try {
    const spells = await readSpells(path.join(dir, "_spells"));
    assert.deepEqual(spells, []);
  } finally {
    cleanupRepo(dir);
  }
});

test("readSpells parses incantations, wards, and curses with correct properties", async () => {
  const dir = makeEmptyRepo();
  const spellsDir = path.join(dir, "_spells");
  try {
    fs.mkdirSync(path.join(spellsDir, "incantations"), { recursive: true });
    fs.mkdirSync(path.join(spellsDir, "wards"), { recursive: true });
    fs.mkdirSync(path.join(spellsDir, "curses"), { recursive: true });

    fs.writeFileSync(
      path.join(spellsDir, "incantations", "commit-message.md"),
      ["---", "name: commit-message", "type: incantation", "description: Commit format", "---", "", "Format: {title}", ""].join("\n"),
    );

    fs.writeFileSync(
      path.join(spellsDir, "wards", "commit-on-done.md"),
      ["---", "name: commit-on-done", "type: ward", "trigger: after-task-complete", "calls: commit-message", "---", "", "Auto-commit body", ""].join("\n"),
    );

    fs.writeFileSync(
      path.join(spellsDir, "curses", "no-db-file-commits.md"),
      ["---", "name: no-db-file-commits", "type: curse", "severity: hard", "---", "", "Never commit db files", ""].join("\n"),
    );

    const spells = await readSpells(spellsDir);
    assert.equal(spells.length, 3);

    const incantation = spells.find((s) => s.type === "incantation");
    assert.ok(incantation);
    assert.equal(incantation.name, "commit-message");
    assert.equal(incantation.description, "Commit format");
    assert.equal(incantation.body, "Format: {title}");

    const ward = spells.find((s) => s.type === "ward");
    assert.ok(ward);
    assert.equal(ward.name, "commit-on-done");
    if (ward.type === "ward") {
      assert.equal(ward.trigger, "after-task-complete");
      assert.equal(ward.calls, "commit-message");
    }

    const curse = spells.find((s) => s.type === "curse");
    assert.ok(curse);
    assert.equal(curse.name, "no-db-file-commits");
    if (curse.type === "curse") {
      assert.equal(curse.severity, "hard");
    }
  } finally {
    cleanupRepo(dir);
  }
});

test("readSpells infers type from directory when frontmatter type is omitted", async () => {
  const dir = makeEmptyRepo();
  const spellsDir = path.join(dir, "_spells");
  try {
    fs.mkdirSync(path.join(spellsDir, "curses"), { recursive: true });
    fs.writeFileSync(
      path.join(spellsDir, "curses", "no-secrets.md"),
      ["---", "name: no-secrets", "severity: hard", "---", "", "Never commit .env files", ""].join("\n"),
    );

    const spells = await readSpells(spellsDir);
    assert.equal(spells.length, 1);
    assert.equal(spells[0]?.type, "curse");
    assert.equal(spells[0]?.name, "no-secrets");
  } finally {
    cleanupRepo(dir);
  }
});

test("readSpells skips malformed files without throwing", async () => {
  const dir = makeEmptyRepo();
  const spellsDir = path.join(dir, "_spells");
  try {
    fs.mkdirSync(spellsDir, { recursive: true });
    fs.writeFileSync(path.join(spellsDir, "broken.md"), "Not valid frontmatter: :::\n");

    const spells = await readSpells(spellsDir);
    assert.deepEqual(spells, []);
  } finally {
    cleanupRepo(dir);
  }
});

test("writeSpellsManifest generates valid manifest.json", async () => {
  const dir = makeEmptyRepo();
  const spellsDir = path.join(dir, "_spells");
  try {
    fs.mkdirSync(path.join(spellsDir, "incantations"), { recursive: true });
    fs.writeFileSync(
      path.join(spellsDir, "incantations", "test.md"),
      ["---", "name: test", "type: incantation", "description: Test template", "---", "", "Format: x", ""].join("\n"),
    );

    const manifestPath = await writeSpellsManifest(spellsDir);
    assert.ok(fs.existsSync(manifestPath));

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.version, "1.0.0");
    assert.equal(manifest.spells.length, 1);
    assert.equal(manifest.spells[0].name, "test");
    assert.equal(manifest.spells[0].type, "incantation");
  } finally {
    cleanupRepo(dir);
  }
});

test("installSpells copies bundled starter spells and writes manifest.json", async () => {
  const dir = makeEmptyRepo();
  try {
    const installed = await installSpells(dir);
    assert.ok(installed >= 3);

    const spells = await readSpells(PROJECT_SPELLS_DIR(dir));
    assert.ok(spells.some((s) => s.name === "commit-message" && s.type === "incantation"));
    assert.ok(spells.some((s) => s.name === "commit-on-done" && s.type === "ward"));
    assert.ok(spells.some((s) => s.name === "no-db-file-commits" && s.type === "curse"));

    const manifestPath = path.join(PROJECT_SPELLS_DIR(dir), "manifest.json");
    assert.ok(fs.existsSync(manifestPath));
  } finally {
    cleanupRepo(dir);
  }
});
