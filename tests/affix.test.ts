import path from "node:path";
import fsExtra from "fs-extra";
const { ensureDir, writeFile, readFile, pathExists } = fsExtra;
import { test } from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";
import { makeEmptyRepo, cleanupRepo } from "./tui-fixtures.js";
import {
  findAvailableSouls,
  findExistingSubagents,
  affixSoulToFile,
  executeAffix,
  extractAffixedSoul,
} from "../src/utils/affix.js";
import { runAffix } from "../src/commands/affix.js";
import type { SoulFile } from "../src/schema/soul.js";

const JARED_SOUL: SoulFile = {
  character: "jared",
  display_name: "Roger Bacon",
  role: "orchestrator",
  voice: "warm and formal",
  glyph: "[*]",
  triggers: ["orchestrate", "battle plan"],
  sourcePath: "/tmp/jared.soul.md",
  body: "# Roger Bacon\nOrchestrates the harness.",
};

const GILFOYLE_SOUL: SoulFile = {
  character: "gilfoyle",
  display_name: "Zoroaster",
  role: "reviewer",
  voice: "cold, sarcastic",
  glyph: "(o)",
  triggers: ["code review"],
  sourcePath: "/tmp/gilfoyle.soul.md",
  body: "# Zoroaster\nReviews code ruthlessly.",
};

test("affix: detects subagents with ONE entry per file across .agents/agents and .claude/agents", async () => {
  const dir = makeEmptyRepo();
  try {
    // 1. Create costs-cleaner in .claude/agents/costs-cleaner.md
    await ensureDir(path.join(dir, ".claude", "agents"));
    const claudeCostsCleaner = `---
name: costs-cleaner
description: Claude costs cleaner
---
# Costs Cleaner
`;
    await writeFile(path.join(dir, ".claude", "agents", "costs-cleaner.md"), claudeCostsCleaner, "utf8");

    // 2. Create costs-cleaner in .agents/agents/costs-cleaner/agent.md
    await ensureDir(path.join(dir, ".agents", "agents", "costs-cleaner"));
    const agyCostsCleaner = `---
name: costs-cleaner
description: Antigravity costs cleaner
---
# Costs Cleaner
`;
    await writeFile(path.join(dir, ".agents", "agents", "costs-cleaner", "agent.md"), agyCostsCleaner, "utf8");

    const detected = await findExistingSubagents(dir);
    // Must be 2 separate entries! One per file!
    assert.equal(detected.length, 2);

    const relPaths = detected.map((d) => d.relPath);
    assert.ok(relPaths.includes(path.join(".claude", "agents", "costs-cleaner.md")));
    assert.ok(relPaths.includes(path.join(".agents", "agents", "costs-cleaner", "agent.md")));
  } finally {
    cleanupRepo(dir);
  }
});

test("affix: extractAffixedSoul detects .hocus/souls links inside agent markdown", () => {
  const markdownWithLink = `---
name: orchestrator
---

> **Soul**: Adopt the persona defined in [.hocus/souls/jared.soul.md](../../.hocus/souls/jared.soul.md).

# User Instructions
`;
  const res = extractAffixedSoul(markdownWithLink);
  assert.equal(res.soulSlug, "jared");
  assert.equal(res.soulPath, ".hocus/souls/jared.soul.md");

  const markdownWithDelimiters = `---
name: reviewer
---

<!-- hocus:soul:start -->
<!-- soul: .hocus/souls/gilfoyle.soul.md -->
> **Soul**: Adopt the persona defined in [.hocus/souls/gilfoyle.soul.md](.hocus/souls/gilfoyle.soul.md).
<!-- hocus:soul:end -->

# Instructions
`;
  const res2 = extractAffixedSoul(markdownWithDelimiters);
  assert.equal(res2.soulSlug, "gilfoyle");
});

test("affix: affixSoulToFile references .hocus/souls/ and replaces existing references cleanly", async () => {
  const dir = makeEmptyRepo();
  try {
    await ensureDir(path.join(dir, ".cursor", "agents"));
    const agentPath = path.join(dir, ".cursor", "agents", "orchestrator.md");

    // Start with an agent having a legacy or existing .hocus/souls reference
    const initialContent = `---
name: orchestrator
description: Custom project orchestrator
---

> **Soul**: Adopt the persona defined in [.hocus/souls/dinesh.soul.md](../../.hocus/souls/dinesh.soul.md).

# Custom Orchestrator Instructions
Do not overwrite this user instruction.
`;
    await writeFile(agentPath, initialContent, "utf8");

    // Affix Jared's soul
    const { updated, previousSoul } = await affixSoulToFile(agentPath, JARED_SOUL, dir);
    assert.equal(updated, true);
    assert.equal(previousSoul, "dinesh");

    const updatedContent = await readFile(agentPath, "utf8");

    // Old dinesh link must be gone!
    assert.ok(!updatedContent.includes("dinesh.soul.md"));

    // Jared reference with .hocus/souls/ must be present
    assert.match(updatedContent, /<!-- hocus:soul:start -->/);
    assert.match(updatedContent, /<!-- soul: \.hocus\/souls\/jared\.soul\.md -->/);
    assert.match(updatedContent, /> \*\*Soul\*\*: Adopt the persona defined in \[\.hocus\/souls\/jared\.soul\.md\]/);
    assert.match(updatedContent, /<!-- hocus:soul:end -->/);

    // Verify .hocus/souls/jared.soul.md exists in dir
    assert.equal(await pathExists(path.join(dir, ".hocus", "souls", "jared.soul.md")), true);

    // Frontmatter and body are preserved
    const { data: fm } = matter(updatedContent);
    assert.equal(fm.name, "orchestrator");
    assert.match(updatedContent, /# Custom Orchestrator Instructions/);
  } finally {
    cleanupRepo(dir);
  }
});

test("affix: runAffix CLI command executes end-to-end with --agent and --soul", async () => {
  const dir = makeEmptyRepo();
  try {
    // Scaffold .hocus/souls/ with jared
    const soulsDir = path.join(dir, ".hocus", "souls");
    await ensureDir(soulsDir);
    await writeFile(
      path.join(soulsDir, "jared.soul.md"),
      `---\ncharacter: jared\ndisplay_name: Roger Bacon\nrole: orchestrator\nvoice: warm\nglyph: "[*]"\ntriggers: [orchestrate]\n---\n# Roger Bacon\nOrchestrate.\n`,
      "utf8",
    );

    // Scaffold custom cursor agent
    const cursorAgentsDir = path.join(dir, ".cursor", "agents");
    await ensureDir(cursorAgentsDir);
    const agentFile = path.join(cursorAgentsDir, "orchestrator.md");
    await writeFile(
      agentFile,
      `---\nname: orchestrator\ndescription: Custom orchestrator\n---\n# My Custom Agent\nRun tasks.\n`,
      "utf8",
    );

    // Run runAffix
    await runAffix({
      repoRoot: dir,
      agent: "orchestrator",
      soul: "jared",
      interactive: false,
    });

    const updatedContent = await readFile(agentFile, "utf8");
    assert.match(updatedContent, /<!-- soul: \.hocus\/souls\/jared\.soul\.md -->/);
    assert.match(updatedContent, /# My Custom Agent/);
  } finally {
    cleanupRepo(dir);
  }
});
