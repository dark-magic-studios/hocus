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

test("gilfoyle-codebase-review is registered in PERSONA_SKILL_IDS", () => {
  assert.equal(PERSONA_SKILL_IDS.has("gilfoyle-codebase-review"), true);
});

test("gilfoyle-codebase-review maps to zoroaster-codebase-review for wizard cast and back for valley cast", () => {
  assert.equal(getSkillIdForCast("gilfoyle-codebase-review", "wizard"), "zoroaster-codebase-review");
  assert.equal(getSkillIdForCast("zoroaster-codebase-review", "valley"), "gilfoyle-codebase-review");
});

test("gilfoyle-codebase-review bundled template exists and parses valid frontmatter", async () => {
  const skillDir = path.join(BUNDLED_SKILLS_DIR, "gilfoyle-codebase-review");
  assert.equal(await pathExists(skillDir), true);

  const skillFile = path.join(skillDir, "SKILL.md");
  assert.equal(await pathExists(skillFile), true);

  const raw = await readFile(skillFile, "utf8");
  const { data, content } = matter(raw);

  assert.equal(data.name, "gilfoyle-codebase-review");
  assert.match(data.description, /^Gilfoyle —/);

  // Checks for the 10 core dimensions and emojis
  assert.match(content, /Requirement Completeness & Edge Cases 🎯/);
  assert.match(content, /Code Readability & Clean Architecture 🏗️/);
  assert.match(content, /Error Handling & Resilience 🛡️/);
  assert.match(content, /Testing Quality over Quantity 🧪/);
  assert.match(content, /State Management & Data Modeling 📊/);
  assert.match(content, /Performance & Efficiency ⚡/);
  assert.match(content, /Security & Input Sanitization 🔒/);
  assert.match(content, /Documentation & Developer Experience \(DX\) 📝/);
  assert.match(content, /Dependency Choices & Pragmatism 📦/);
  assert.match(content, /Git Hygiene & Commit History 🌳/);

  // Checks for grading from 0-10
  assert.match(content, /0[–\-]10/);

  // Checks for codebase context intake
  assert.match(content, /Technical Challenge/i);
  assert.match(content, /Production Grade App/i);
  assert.match(content, /Landing Page/i);
  assert.match(content, /Personal Project/i);
  assert.match(content, /Small Business App/i);
  assert.match(content, /Indie Game/i);

  // Checks for context-dependent conclusions
  assert.match(content, /Interview Likelihood Ranking/i);
  assert.match(content, /5[–\-]10 Targeted Interview Questions/i);
  assert.match(content, /Next Critical Features/i);
  assert.match(content, /Exploitation Vectors & Security Holes/i);
});

test("transformSkillFrontmatterForCast renames gilfoyle-codebase-review to zoroaster-codebase-review", async () => {
  const skillFile = path.join(BUNDLED_SKILLS_DIR, "gilfoyle-codebase-review", "SKILL.md");
  const raw = await readFile(skillFile, "utf8");

  const wizardTransformed = transformSkillFrontmatterForCast(raw, "wizard");
  const wizardParsed = matter(wizardTransformed);
  assert.equal(wizardParsed.data.name, "zoroaster-codebase-review");
  assert.match(wizardParsed.data.description, /^Zoroaster —/);

  const valleyTransformed = transformSkillFrontmatterForCast(wizardTransformed, "valley");
  const valleyParsed = matter(valleyTransformed);
  assert.equal(valleyParsed.data.name, "gilfoyle-codebase-review");
  assert.match(valleyParsed.data.description, /^Gilfoyle —/);
});

test("findSkillDir locates bundled gilfoyle-codebase-review and zoroaster-codebase-review", async () => {
  const foundValley = await findSkillDir("gilfoyle-codebase-review", PACKAGE_ROOT);
  assert.ok(foundValley);
  assert.equal(foundValley.skillName, "gilfoyle-codebase-review");
  assert.equal(await pathExists(path.join(foundValley.sourceDir, "SKILL.md")), true);

  const foundWizard = await findSkillDir("zoroaster-codebase-review", PACKAGE_ROOT);
  assert.ok(foundWizard);
  assert.equal(await pathExists(path.join(foundWizard.sourceDir, "SKILL.md")), true);
});
