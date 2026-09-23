import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recordPristineFiles, resolveUpgradeScope, runUpgrade, UPGRADE_MANIFEST_FILE } from "../src/commands/upgrade.js";
import { runInit } from "../src/commands/init.js";
import { makeEmptyRepo, cleanupRepo } from "./tui-fixtures.js";
import { BUNDLED_PERSONAS_DIR, BUNDLED_SKILLS_DIR } from "../src/utils/paths.js";
import { getSoulFilenameForCast, transformSkillFrontmatterForCast, transformSoulForCast } from "../src/utils/cast.js";

const bundledPersonas = fs.readdirSync(BUNDLED_PERSONAS_DIR).filter((f) => f.endsWith(".soul.md"));

function expectedPersona(file: string): { name: string; content: string } {
  const raw = fs.readFileSync(path.join(BUNDLED_PERSONAS_DIR, file), "utf8");
  return {
    name: getSoulFilenameForCast(path.basename(file, ".soul.md"), "valley"),
    content: transformSoulForCast(raw, "valley"),
  };
}

function seedRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hocus-upgrade-"));
  const personasDir = path.join(dir, ".hocus", "personas");
  fs.mkdirSync(personasDir, { recursive: true });
  fs.writeFileSync(path.join(dir, ".hocus", "config.json"), JSON.stringify({ cast: "valley" }));
  for (const file of bundledPersonas) {
    const { name, content } = expectedPersona(file);
    fs.writeFileSync(path.join(personasDir, name), content);
  }
  return dir;
}

function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = fs.readFileSync(full, "utf8");
    }
  };
  walk(dir);
  return out;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const readManifest = (dir: string) => JSON.parse(fs.readFileSync(UPGRADE_MANIFEST_FILE(dir), "utf8"));
const [first, second] = bundledPersonas.map(expectedPersona);

test("user-edited persona survives upgrade and gets a .new sidecar", async () => {
  const dir = seedRepo();
  try {
    const dest = path.join(dir, ".hocus", "personas", first.name);
    const edited = first.content + "\n## my custom notes\n";
    fs.writeFileSync(dest, edited);

    await runUpgrade({ repoRoot: dir, skills: false });

    assert.equal(fs.readFileSync(dest, "utf8"), edited);
    assert.equal(fs.readFileSync(`${dest}.new`, "utf8"), first.content);
    const manifest = readManifest(dir);
    assert.equal(manifest.files[`.hocus/personas/${second.name}`], sha(second.content));
    assert.equal(manifest.files[`.hocus/personas/${first.name}`], undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("pristine persona is updated when bundled content changes", async () => {
  const dir = seedRepo();
  try {
    const dest = path.join(dir, ".hocus", "personas", first.name);
    // Simulate an older bundled version that hocus wrote and the user never touched.
    const older = first.content.replace(/\n$/, "") + "\nolder bundled wording\n";
    fs.writeFileSync(dest, older);
    fs.writeFileSync(
      UPGRADE_MANIFEST_FILE(dir),
      JSON.stringify({ version: 1, files: { [`.hocus/personas/${first.name}`]: sha(older) } }),
    );

    await runUpgrade({ repoRoot: dir, skills: false });

    assert.equal(fs.readFileSync(dest, "utf8"), first.content);
    assert.equal(fs.existsSync(`${dest}.new`), false);
    assert.equal(readManifest(dir).files[`.hocus/personas/${first.name}`], sha(first.content));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--force overwrites a user-edited persona", async () => {
  const dir = seedRepo();
  try {
    const dest = path.join(dir, ".hocus", "personas", first.name);
    fs.writeFileSync(dest, "totally custom");

    await runUpgrade({ repoRoot: dir, skills: false, force: true });

    assert.equal(fs.readFileSync(dest, "utf8"), first.content);
    assert.equal(fs.existsSync(`${dest}.new`), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("dryRun writes nothing, including the manifest", async () => {
  const dir = seedRepo();
  try {
    fs.writeFileSync(path.join(dir, ".hocus", "personas", first.name), "user edit");
    fs.rmSync(path.join(dir, ".hocus", "personas", second.name));
    fs.mkdirSync(path.join(dir, ".agents", "skills"), { recursive: true });
    const before = snapshot(dir);

    await runUpgrade({ repoRoot: dir, dryRun: true });
    await runUpgrade({ repoRoot: dir, dryRun: true, force: true });

    assert.deepEqual(snapshot(dir), before);
    assert.equal(fs.existsSync(UPGRADE_MANIFEST_FILE(dir)), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("user-edited skill file is kept and bundled version lands beside it", async () => {
  const dir = seedRepo();
  try {
    const skill = "atomic-commits";
    const skillDir = path.join(dir, ".agents", "skills", skill);
    fs.mkdirSync(skillDir, { recursive: true });
    const bundled = transformSkillFrontmatterForCast(
      fs.readFileSync(path.join(BUNDLED_SKILLS_DIR, skill, "SKILL.md"), "utf8"),
      "valley",
    );
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "my own atomic commits rules");

    await runUpgrade({ repoRoot: dir, personas: false });

    assert.equal(fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8"), "my own atomic commits rules");
    assert.equal(fs.readFileSync(path.join(skillDir, "SKILL.md.new"), "utf8"), bundled);

    // A second upgrade after the user accepts the bundled version tracks it as pristine.
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), bundled);
    await runUpgrade({ repoRoot: dir, personas: false });
    assert.equal(readManifest(dir).files[`.agents/skills/${skill}/SKILL.md`], sha(bundled));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveUpgradeScope handles every flag combination", () => {
  const cases: Array<[string[], { personas: boolean; skills: boolean }]> = [
    [[], { personas: true, skills: true }],
    [["--personas"], { personas: true, skills: false }],
    [["--skills"], { personas: false, skills: true }],
    [["--personas", "--skills"], { personas: true, skills: true }],
    [["--no-personas"], { personas: false, skills: true }],
    [["--no-skills"], { personas: true, skills: false }],
  ];
  for (const [flags, expected] of cases) {
    assert.deepEqual(resolveUpgradeScope(["upgrade", "--dry-run", ...flags]), expected, flags.join(" ") || "(none)");
  }
});

test("files written by runInit are treated as pristine by a later upgrade", async () => {
  const dir = makeEmptyRepo();
  try {
    await runInit({ repoRoot: dir, agent: "claude", cast: "valley", spawnFn: (() => ({ error: undefined })) as any });

    // Simulate an older bundled persona that hocus wrote (e.g. by a previous hocus version).
    const dest = path.join(dir, ".hocus", "personas", first.name);
    const older = first.content.replace(/\n$/, "") + "\nolder bundled wording\n";
    fs.writeFileSync(dest, older);
    await recordPristineFiles(dir, [dest]);

    await runUpgrade({ repoRoot: dir });

    assert.equal(fs.readFileSync(dest, "utf8"), first.content);
    const sidecars = Object.keys(snapshot(dir)).filter((f) => f.endsWith(".new"));
    assert.deepEqual(sidecars, []);
  } finally {
    cleanupRepo(dir);
  }
});
