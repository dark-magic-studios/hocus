import path from "node:path";
import fsExtra from "fs-extra";
const { ensureDir, writeFile, readFile, pathExists } = fsExtra;
import { test } from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";
import { makeEmptyRepo, cleanupRepo } from "./tui-fixtures.js";
import {
  findAvailablePersonas,
  findAgentsUsingPersona,
  executeAbsorb,
} from "../src/utils/absorb.js";

const DINESH_SOUL = `---
character: dinesh
display_name: Flamel
role: server-dev
voice: competent, a little vain
glyph: "</>"
aliases:
  valley: Dinesh
  occult: Flamel
triggers:
  - backend task
---
# Flamel (Dinesh) — Server Dev
Writes server code.
`;

const GILFOYLE_SOUL = `---
character: gilfoyle
display_name: Zoroaster
role: reviewer
voice: cold, precise
glyph: "(o)"
aliases:
  valley: Gilfoyle
  occult: Zoroaster
triggers:
  - code review
---
# Zoroaster (Gilfoyle) — Reviewer
Reviews code.
`;

const FAMILIAR_SOUL = `---
character: sub-worker
display_name: SubWorker
role: familiar
voice: quiet
glyph: "[*]"
parent: dinesh
triggers: []
---
# SubWorker
A familiar bound to dinesh.
`;

test("absorb: finds agents using target persona and migrates them", async () => {
  const dir = makeEmptyRepo();
  try {
    const personasDir = path.join(dir, ".hocus", "personas");
    await ensureDir(personasDir);
    await writeFile(path.join(personasDir, "dinesh.soul.md"), DINESH_SOUL, "utf8");
    await writeFile(path.join(personasDir, "gilfoyle.soul.md"), GILFOYLE_SOUL, "utf8");
    await writeFile(path.join(personasDir, "sub-worker.soul.md"), FAMILIAR_SOUL, "utf8");

    // Create agents using dinesh
    const claudeAgentsDir = path.join(dir, ".claude", "agents");
    await ensureDir(claudeAgentsDir);
    const serverDevClaude = `---
name: server-dev
character: dinesh
display_name: Flamel
role: server-dev
voice: competent, a little vain
glyph: "</>"
skills:
  - dinesh-pr-open
  - atomic-commits
---
# Flamel (Dinesh) — Server Dev
Instructions here.
`;
    await writeFile(path.join(claudeAgentsDir, "server-dev.md"), serverDevClaude, "utf8");

    // Standalone compiled agent
    const dineshClaude = `---
name: dinesh
character: dinesh
display_name: Flamel
role: server-dev
---
# Flamel
`;
    await writeFile(path.join(claudeAgentsDir, "dinesh.md"), dineshClaude, "utf8");

    // Antigravity agent
    const agyDir = path.join(dir, ".agents", "agents", "server-dev");
    await ensureDir(agyDir);
    await writeFile(
      path.join(agyDir, "agent.md"),
      `---\nname: server-dev\ncharacter: dinesh\ndisplay_name: Flamel\nrole: server-dev\n---\n# Flamel (Dinesh)\n`,
      "utf8",
    );

    // 1. Verify findAvailablePersonas
    const personas = await findAvailablePersonas(dir);
    assert.equal(personas.length, 3);

    // 2. Verify findAgentsUsingPersona
    const agentGroups = await findAgentsUsingPersona(dir, "dinesh");
    const groupIds = agentGroups.map((g) => g.id);
    assert.ok(groupIds.includes("server-dev"));
    assert.ok(groupIds.includes("sub-worker"));
    assert.ok(groupIds.includes("dinesh"));

    // 3. Execute absorb
    const result = await executeAbsorb({
      repoRoot: dir,
      targetPersona: "dinesh",
      assignments: {
        "server-dev": "gilfoyle",
        "dinesh": "gilfoyle",
        "sub-worker": "gilfoyle",
      },
    });

    assert.equal(result.targetPersona, "dinesh");
    assert.ok(result.migratedAgents.some((m) => m.agentId === "server-dev"));

    // Check server-dev.md was updated
    const updatedClaude = await readFile(path.join(claudeAgentsDir, "server-dev.md"), "utf8");
    const { data: fm, content: body } = matter(updatedClaude);
    assert.equal(fm.character, "gilfoyle");
    assert.equal(fm.display_name, "Zoroaster");
    assert.equal(fm.glyph, "(o)");
    assert.ok(fm.skills.includes("atomic-commits"));
    assert.ok(fm.skills.includes("gilfoyle-pr-review"));
    assert.ok(!fm.skills.includes("dinesh-pr-open"));
    assert.match(body, /# Zoroaster \(gilfoyle\) — Server Dev/);

    // Check antigravity file was updated
    const updatedAgy = await readFile(path.join(agyDir, "agent.md"), "utf8");
    const { data: agyFm } = matter(updatedAgy);
    assert.equal(agyFm.character, "gilfoyle");
    assert.equal(agyFm.display_name, "Zoroaster");

    // Check familiar parent was updated
    const updatedFamiliar = await readFile(path.join(personasDir, "sub-worker.soul.md"), "utf8");
    const { data: famFm } = matter(updatedFamiliar);
    assert.equal(famFm.parent, "gilfoyle");

    // Check dinesh.soul.md was removed
    assert.equal(await pathExists(path.join(personasDir, "dinesh.soul.md")), false);
    // gilfoyle.soul.md still exists
    assert.equal(await pathExists(path.join(personasDir, "gilfoyle.soul.md")), true);

    // Check dashboard was generated
    assert.equal(await pathExists(path.join(dir, "dashboard.html")), true);
  } finally {
    cleanupRepo(dir);
  }
});
