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
  buildSoulReferenceBlock,
  groupSubagents,
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

test("affix: detects subagents across Cursor, Claude Code, and Antigravity directories", async () => {
  const dir = makeEmptyRepo();
  try {
    // 1. Create Cursor agent (.cursor/agents/orchestrator.md)
    await ensureDir(path.join(dir, ".cursor", "agents"));
    const cursorAgentContent = `---
name: orchestrator
description: Custom project orchestrator
tools:
  - read_file
---

# Custom Orchestrator
Manage tickets and sprint planning.
`;
    await writeFile(path.join(dir, ".cursor", "agents", "orchestrator.md"), cursorAgentContent, "utf8");

    // 2. Create Claude Code agent (.claude/agents/reviewer.md)
    await ensureDir(path.join(dir, ".claude", "agents"));
    const claudeAgentContent = `---
name: reviewer
description: Pull request reviewer
---

# PR Reviewer
Reviews all PRs before merge.
`;
    await writeFile(path.join(dir, ".claude", "agents", "reviewer.md"), claudeAgentContent, "utf8");

    // 3. Create Antigravity agent (.agents/agents/qa/agent.md)
    await ensureDir(path.join(dir, ".agents", "agents", "qa"));
    const agyAgentContent = `---
name: qa
description: Automated test runner
subagent: true
---

# QA Subagent
Runs test suites.
`;
    await writeFile(path.join(dir, ".agents", "agents", "qa", "agent.md"), agyAgentContent, "utf8");

    const detected = await findExistingSubagents(dir);
    assert.equal(detected.length, 3);

    const ids = detected.map((d) => d.id);
    assert.ok(ids.includes("orchestrator"));
    assert.ok(ids.includes("reviewer"));
    assert.ok(ids.includes("qa"));

    const cursorAgent = detected.find((d) => d.id === "orchestrator");
    assert.equal(cursorAgent?.provider, "cursor");
    assert.equal(cursorAgent?.relPath, path.join(".cursor", "agents", "orchestrator.md"));

    const groups = groupSubagents(detected);
    assert.equal(groups.length, 3);
  } finally {
    cleanupRepo(dir);
  }
});

test("affix: affixSoulToFile only touches the target file and inserts reference after frontmatter", async () => {
  const dir = makeEmptyRepo();
  try {
    await ensureDir(path.join(dir, ".cursor", "agents"));
    const agentPath = path.join(dir, ".cursor", "agents", "orchestrator.md");
    const originalContent = `---
name: orchestrator
description: Custom project orchestrator
custom_setting: preserve_me
---

# Custom Orchestrator Instructions
Do not overwrite this user instruction.
`;
    await writeFile(agentPath, originalContent, "utf8");

    // Affix Jared's soul
    const { updated } = await affixSoulToFile(agentPath, JARED_SOUL, dir);
    assert.equal(updated, true);

    const updatedContent = await readFile(agentPath, "utf8");

    // Check frontmatter is preserved
    const { data: fm } = matter(updatedContent);
    assert.equal(fm.name, "orchestrator");
    assert.equal(fm.description, "Custom project orchestrator");
    assert.equal(fm.custom_setting, "preserve_me");

    // Check body still has user instructions
    assert.match(updatedContent, /# Custom Orchestrator Instructions/);
    assert.match(updatedContent, /Do not overwrite this user instruction\./);

    // Check soul reference block is placed immediately after frontmatter
    assert.match(updatedContent, /<!-- hocus:soul:start -->/);
    assert.match(updatedContent, /<!-- soul: \.hocus\/personas\/jared\.soul\.md -->/);
    assert.match(updatedContent, /> \*\*Soul\*\*: Adopt the persona and behavioral guidelines defined in \[\.hocus\/personas\/jared\.soul\.md\]/);
    assert.match(updatedContent, /<!-- hocus:soul:end -->/);

    // Verify ordering: frontmatter delimiter --- comes before soul block, which comes before heading
    const fmEnd = updatedContent.indexOf("---\n\n<!-- hocus:soul:start -->");
    const headingPos = updatedContent.indexOf("# Custom Orchestrator Instructions");
    assert.ok(fmEnd !== -1, "Reference must be immediately after frontmatter");
    assert.ok(headingPos > fmEnd, "User heading must follow reference block");
  } finally {
    cleanupRepo(dir);
  }
});

test("affix: re-affixing replaces the previous soul reference without duplication", async () => {
  const dir = makeEmptyRepo();
  try {
    await ensureDir(path.join(dir, ".cursor", "agents"));
    const agentPath = path.join(dir, ".cursor", "agents", "orchestrator.md");
    const originalContent = `---
name: orchestrator
description: Custom project orchestrator
---

# Original Body
`;
    await writeFile(agentPath, originalContent, "utf8");

    // 1. First affix Jared
    await affixSoulToFile(agentPath, JARED_SOUL, dir);
    const content1 = await readFile(agentPath, "utf8");
    assert.match(content1, /jared\.soul\.md/);

    // 2. Re-affix Gilfoyle
    const { updated, previousSoul } = await affixSoulToFile(agentPath, GILFOYLE_SOUL, dir);
    assert.equal(updated, true);
    assert.equal(previousSoul, "jared");

    const content2 = await readFile(agentPath, "utf8");
    assert.match(content2, /gilfoyle\.soul\.md/);
    assert.ok(!content2.includes("jared.soul.md"), "Old soul reference should be replaced");

    // Ensure only one soul block exists
    const matches = content2.match(/<!-- hocus:soul:start -->/g);
    assert.equal(matches?.length, 1);
  } finally {
    cleanupRepo(dir);
  }
});

test("affix: runAffix CLI command executes end-to-end with --agent and --soul", async () => {
  const dir = makeEmptyRepo();
  try {
    // Scaffold .hocus/personas/ with jared
    const personasDir = path.join(dir, ".hocus", "personas");
    await ensureDir(personasDir);
    await writeFile(
      path.join(personasDir, "jared.soul.md"),
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
    assert.match(updatedContent, /<!-- soul: \.hocus\/personas\/jared\.soul\.md -->/);
    assert.match(updatedContent, /# My Custom Agent/);
  } finally {
    cleanupRepo(dir);
  }
});
