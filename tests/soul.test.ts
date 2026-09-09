import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSoulFile } from "../src/schema/soul.js";
import { CAST_MAP, BASE_AGENT_TO_VALLEY } from "../src/utils/cast.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERSONAS_DIR = path.join(__dirname, "..", "src", "personas");

test("every bundled persona parses against the SOUL.md schema", () => {
  const files = readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".soul.md"));
  assert.equal(files.length, 13, "expected 13 bundled persona files");

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

test("every bundled persona uses <base_agent>.soul.md nomenclature and character matches filename", () => {
  const files = readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".soul.md"));
  for (const file of files) {
    const baseSlug = path.basename(file, ".soul.md");
    const soul = parseSoulFile(path.join(PERSONAS_DIR, file));
    assert.equal(soul.character, baseSlug, `${file}: character "${soul.character}" must match filename stem "${baseSlug}"`);
    assert.equal(soul.role, baseSlug, `${file}: role "${soul.role}" must match base agent name "${baseSlug}"`);
  }
});

test("every bundled persona has valley and occult cast mappings in CAST_MAP", () => {
  const files = readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".soul.md"));
  for (const file of files) {
    const baseSlug = path.basename(file, ".soul.md");
    const valleySlug = BASE_AGENT_TO_VALLEY[baseSlug];
    assert.ok(valleySlug, `${file}: missing BASE_AGENT_TO_VALLEY mapping for "${baseSlug}"`);
    const entry = CAST_MAP[valleySlug];
    assert.ok(entry, `${file}: missing CAST_MAP entry for valley slug "${valleySlug}"`);
    assert.ok(entry.valleyDisplay, `${file}: missing valleyDisplay`);
    assert.ok(entry.wizardDisplay, `${file}: missing wizardDisplay`);
    assert.ok(entry.wizardSlug, `${file}: missing wizardSlug`);
  }
});

test("every bundled persona includes personality traits and example responses", () => {
  const files = readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".soul.md"));
  for (const file of files) {
    const soul = parseSoulFile(path.join(PERSONAS_DIR, file));
    assert.match(soul.body, /## Personality Traits/, `${file}: missing "## Personality Traits" section`);
    assert.match(soul.body, /## Example Responses/, `${file}: missing "## Example Responses" section`);
    assert.match(soul.body, />\s*"/, `${file}: expected blockquote example responses starting with > "`);
  }
});
