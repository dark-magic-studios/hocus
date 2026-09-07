import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
const { mkdtemp, rm, mkdir } = fsExtra;
import os from "node:os";
import matter from "gray-matter";
import { antigravityCompiler } from "../src/compilers/antigravity.js";
import { ALL_COMPILERS, getCompiler } from "../src/compilers/index.js";
import type { SoulFile } from "../src/schema/soul.js";

function makeSoul(overrides: Partial<SoulFile> = {}): SoulFile {
  return {
    character: "merlin",
    display_name: "Merlin",
    role: "planner",
    voice: "cryptic and patient",
    glyph: "[?]",
    triggers: ["planning", "architecture"],
    sourcePath: "/fake/merlin.soul.md",
    body: "# Merlin — Planner\n\nBreaks goals into phases and delegates to specialists.",
    ...overrides,
  } as SoulFile;
}

const CTX = { repoRoot: "/repo", stack: { languages: [], frameworks: [] } };

test("antigravity compiler is registered and reachable via getCompiler", () => {
  assert.ok(ALL_COMPILERS.some((c) => c.id === "antigravity"));
  assert.equal(getCompiler("antigravity").label, "Antigravity");
});

test("antigravity compiler emits native frontmatter with subagent: true and agent.md path", () => {
  const compiled = antigravityCompiler.compile(makeSoul(), CTX);

  assert.equal(compiled.relPath, path.join(".agents", "agents", "merlin", "agent.md"));

  const { data, content } = matter(compiled.content);
  assert.equal(data.name, "merlin");
  assert.match(data.description, /Merlin — planner/);
  assert.match(data.description, /Use for: planning, architecture/);
  assert.equal(data.subagent, true);
  assert.equal(data.model, "inherit");
  assert.match(content, /# Merlin — Planner/);
  assert.match(content, /Breaks goals into phases/);
});

test("antigravity compiler prepends Agent System Instructions if body lacks H1", () => {
  const compiled = antigravityCompiler.compile(makeSoul({ body: "Just plain instructions." }), CTX);
  const { content } = matter(compiled.content);
  assert.match(content, /# Agent System Instructions\n\nJust plain instructions\./);
});

test("antigravity compiler maps hocus tool names to Antigravity tool ids", () => {
  const compiled = antigravityCompiler.compile(
    makeSoul({ tools: ["read", "grep", "bash", "write", "edit"] }),
    CTX,
  );
  const { data } = matter(compiled.content);
  assert.deepEqual(data.tools, [
    "view_file",
    "list_dir",
    "grep_search",
    "run_command",
    "manage_task",
    "write_to_file",
    "replace_file_content",
    "multi_replace_file_content",
  ]);
});

test("antigravity compiler passes model through", () => {
  const compiled = antigravityCompiler.compile(makeSoul({ model: "gemini-2.5-pro" }), CTX);
  const { data } = matter(compiled.content);
  assert.equal(data.model, "gemini-2.5-pro");
});

test("antigravity compiler detects an existing .agents or .gemini directory", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hocus-agy-detect-"));
  try {
    assert.equal(await antigravityCompiler.detect(dir), false);
    await mkdir(path.join(dir, ".agents"));
    assert.equal(await antigravityCompiler.detect(dir), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
