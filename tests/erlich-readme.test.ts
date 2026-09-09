import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
const { readFile, pathExists } = fsExtra;
import matter from "gray-matter";
import {
  PERSONA_SKILL_IDS,
  getSkillIdForCast,
  transformSkillFrontmatterForCast,
} from "../src/utils/cast.js";
import { BUNDLED_SKILLS_DIR, PACKAGE_ROOT } from "../src/utils/paths.js";
import { findSkillDir } from "../src/commands/add.js";

test("erlich-readme is registered in PERSONA_SKILL_IDS", () => {
  assert.equal(PERSONA_SKILL_IDS.has("erlich-readme"), true);
});

test("erlich-readme maps to circe-readme for wizard cast and back for valley cast", () => {
  assert.equal(getSkillIdForCast("erlich-readme", "wizard"), "circe-readme");
  assert.equal(getSkillIdForCast("circe-readme", "valley"), "erlich-readme");
});

test("erlich-readme bundled template exists and parses valid frontmatter", async () => {
  const skillDir = path.join(BUNDLED_SKILLS_DIR, "erlich-readme");
  assert.equal(await pathExists(skillDir), true);

  const skillFile = path.join(skillDir, "SKILL.md");
  assert.equal(await pathExists(skillFile), true);

  const raw = await readFile(skillFile, "utf8");
  const { data, content } = matter(raw);

  assert.equal(data.name, "erlich-readme");
  assert.match(data.description, /^Erlich —/);

  // Checks for required instructions and grounded sources
  assert.match(content, /PRODUCT\.md/);
  assert.match(content, /DECISIONS\.md/);
  assert.match(content, /MEMORY\.md/);
  assert.match(content, /whismy-injector/);
  assert.match(content, /deslopify/);
  assert.match(content, /Mermaid/i);
});

test("transformSkillFrontmatterForCast renames erlich-readme to circe-readme", async () => {
  const skillFile = path.join(BUNDLED_SKILLS_DIR, "erlich-readme", "SKILL.md");
  const raw = await readFile(skillFile, "utf8");

  const wizardTransformed = transformSkillFrontmatterForCast(raw, "wizard");
  const wizardParsed = matter(wizardTransformed);
  assert.equal(wizardParsed.data.name, "circe-readme");
  assert.match(wizardParsed.data.description, /^Circe —/);

  const valleyTransformed = transformSkillFrontmatterForCast(wizardTransformed, "valley");
  const valleyParsed = matter(valleyTransformed);
  assert.equal(valleyParsed.data.name, "erlich-readme");
  assert.match(valleyParsed.data.description, /^Erlich —/);
});

test("findSkillDir locates bundled erlich-readme", async () => {
  const found = await findSkillDir("erlich-readme", PACKAGE_ROOT);
  assert.ok(found);
  assert.equal(found.skillName, "erlich-readme");
  assert.equal(await pathExists(path.join(found.sourceDir, "SKILL.md")), true);
});
