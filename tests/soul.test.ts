import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSoulFile } from "../src/schema/soul.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERSONAS_DIR = path.join(__dirname, "..", "src", "personas");

test("every bundled persona parses against the SOUL.md schema", () => {
  const files = readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".soul.md"));
  assert.ok(files.length > 0, "expected at least one persona file");

  for (const file of files) {
    const soul = parseSoulFile(path.join(PERSONAS_DIR, file));
    assert.ok(soul.character.length > 0, `${file}: missing character`);
    assert.ok(soul.display_name.length > 0, `${file}: missing display_name`);
    assert.ok(soul.role.length > 0, `${file}: missing role`);
    assert.ok(soul.body.length > 0, `${file}: body should not be empty`);
  }
});

test("character slug is lowercase and hyphenated, no spaces", () => {
  const files = readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".soul.md"));
  for (const file of files) {
    const soul = parseSoulFile(path.join(PERSONAS_DIR, file));
    assert.match(soul.character, /^[a-z0-9-]+$/, `${file}: character "${soul.character}" is not a valid slug`);
  }
});
