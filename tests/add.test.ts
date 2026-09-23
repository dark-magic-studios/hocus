import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
const { mkdtemp, rm, pathExists, readFile, ensureDir, writeFile } = fsExtra;
import os from "node:os";
import { runAdd, findAgentSoul } from "../src/commands/add.js";
import { SoulValidationError } from "../src/schema/soul.js";
import { PROJECT_PERSONAS_DIR } from "../src/utils/paths.js";

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
    assert.equal(await pathExists(path.join(repoRoot, ".cursor", "agents", "dinesh.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "agents", "dinesh", "agent.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".commandcode", "agents", "dinesh.md")), true);

    const agyContent = await readFile(path.join(repoRoot, ".agents", "agents", "dinesh", "agent.md"), "utf8");
    assert.match(agyContent, /subagent:\s*true/);
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
    assert.equal(await pathExists(path.join(fakeHome, ".cursor", "agents", "gilfoyle.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".gemini", "config", "agents", "gilfoyle", "agent.md")), true);
    assert.equal(await pathExists(path.join(fakeHome, ".commandcode", "agents", "gilfoyle.md")), true);

    const globalAgy = await readFile(path.join(fakeHome, ".gemini", "config", "agents", "gilfoyle", "agent.md"), "utf8");
    assert.match(globalAgy, /subagent:\s*true/);

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
    assert.equal(await pathExists(path.join(repoRoot, ".cursor", "agents", "erlich.md")), true);

    // Should NOT install to opencode & antigravity
    assert.equal(await pathExists(path.join(repoRoot, ".opencode", "agent", "erlich.md")), false);
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "agents", "erlich", "agent.md")), false);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("runAdd installs single rule and all rules locally", async () => {
  const repoRoot = await makeTmpDir();
  try {
    // Single rule
    await runAdd({
      repoRoot,
      rule: "commit-hygiene",
      local: true,
    });
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "rules", "commit-hygiene.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "rules", "architecture.md")), false);

    // All rules
    await runAdd({
      repoRoot,
      rule: "all",
      local: true,
    });
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "rules", "architecture.md")), true);
    assert.equal(await pathExists(path.join(repoRoot, ".agents", "rules", "testing-standards.md")), true);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("runAdd installs rule globally", async () => {
  const repoRoot = await makeTmpDir();
  const fakeHome = await makeTmpDir();
  try {
    await runAdd({
      repoRoot,
      rule: "token-efficiency",
      global: true,
      overrideHomeDir: fakeHome,
    });
    assert.equal(await pathExists(path.join(fakeHome, ".gemini", "config", "rules", "token-efficiency.md")), true);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
    await rm(fakeHome, { recursive: true, force: true });
  }
});

test("findAgentSoul throws SoulValidationError for a malformed soul instead of returning null", async () => {
  const repoRoot = await makeTmpDir();
  try {
    const personasDir = PROJECT_PERSONAS_DIR(repoRoot);
    await ensureDir(personasDir);
    await writeFile(
      path.join(personasDir, "broken-bot.soul.md"),
      "---\ncharacter: broken-bot\n---\n\nmissing required frontmatter fields\n",
      "utf8",
    );

    await assert.rejects(
      () => findAgentSoul("broken-bot", repoRoot),
      (err: unknown) => {
        assert.ok(err instanceof SoulValidationError);
        assert.ok(err.issues.length > 0);
        return true;
      },
    );

    const fromPath = path.join(personasDir, "broken-bot.soul.md");
    await assert.rejects(() => findAgentSoul("anything", repoRoot, fromPath), SoulValidationError);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("findAgentSoul still returns null when no candidate exists", async () => {
  const repoRoot = await makeTmpDir();
  try {
    assert.equal(await findAgentSoul("definitely-not-a-persona", repoRoot), null);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
