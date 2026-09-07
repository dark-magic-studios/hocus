import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
const { mkdtemp, rm, pathExists, readFile } = fsExtra;
import os from "node:os";
import { runAdd } from "../src/commands/add.js";

async function makeTmpDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "hocus-add-test-"));
}

test("runAdd installs agent locally to all target providers", async () => {
  const repoRoot = await makeTmpDir();
  try {
    await runAdd({
      repoRoot,
      agent: "dinesh",
      local: true,
      interactive: false,
    });

    assert.equal(await pathExists(path.join(repoRoot, ".claude", "agents", "dinesh.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".opencode", "agent", "dinesh.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".cursor", "rules", "dinesh.mdc")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "rules", "dinesh.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".commandcode", "agents", "dinesh.md")), true);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("runAdd installs skill locally to target provider skill folders", async () => {
  const repoRoot = await makeTmpDir();
  try {
    await runAdd({
      repoRoot,
      skill: "atomic-commits",
      local: true,
      interactive: false,
    });

    assert.equal(await pathExists(path.join(repoRoot, ".claude", "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".commandcode", "skills", "atomic-commits", "SKILL.md")), true);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("runAdd supports both --agent and --skill simultaneously with --global flag", async () => {
  const repoRoot = await makeTmpDir();
  const fakeHome = await makeTmpDir();
  try {
    await runAdd({
      repoRoot,
      agent: "gilfoyle",
      skill: "atomic-commits",
      global: true,
      interactive: false,
      overrideHomeDir: fakeHome,
    });

    // Global agent files
    assert.equal(await pathExists(path.join(fakeHome, ".claude", "agents", "gilfoyle.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".config", "opencode", "agent", "gilfoyle.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".cursor", "rules", "gilfoyle.mdc")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".gemini", "antigravity", "rules", "gilfoyle.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".commandcode", "agents", "gilfoyle.md")), true);

    // Global skill folders
    assert.equal(await pathExists(path.join(fakeHome, ".claude", "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".config", "opencode", "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".cursor", "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".gemini", "antigravity", "skills", "atomic-commits", "SKILL.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".commandcode", "skills", "atomic-commits", "SKILL.md")), true);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
    await rm(fakeHome, { recursive: true, force: true });
  }
});

test("runAdd respects explicit --providers list", async () => {
  const repoRoot = await makeTmpDir();
  try {
    await runAdd({
      repoRoot,
      agent: "erlich",
      skill: "atomic-commits",
      providers: ["claude-code", "cursor"],
      local: true,
    });

    // Should install to claude-code & cursor
    assert.equal(await pathExists(path.join(repoRoot, ".claude", "agents", "erlich.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".cursor", "rules", "erlich.mdc")), true);

    // Should NOT install to opencode & antigravity
    assert.equal(await pathExists(path.join(repoRoot, ".opencode", "agent", "erlich.md")), false);
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "rules", "erlich.md")), false);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
