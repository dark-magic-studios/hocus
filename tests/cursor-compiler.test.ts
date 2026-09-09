import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
import os from "node:os";
import matter from "gray-matter";
import { cursorCompiler } from "../src/compilers/cursor.js";
import { ALL_COMPILERS, getCompiler } from "../src/compilers/index.js";
import type { SoulFile } from "../src/schema/soul.js";

const soul: SoulFile = {
  character: "merlin",
  display_name: "Merlin",
  role: "planner",
  voice: "cryptic and patient",
  glyph: "[?]",
  triggers: ["planning", "architecture"],
  sourcePath: "/fake/merlin.soul.md",
  body: "# Merlin\nPlan deliberately and delegate bounded work.",
};

const context = { repoRoot: "/repo", stack: { languages: [], frameworks: [] } };

test("Cursor compiler emits a project-scoped native subagent markdown file", () => {
  const compiled = cursorCompiler.compile(soul, context);
  assert.equal(compiled.relPath, path.join(".cursor", "agents", "merlin.md"));

  const { data: fm, content } = matter(compiled.content);
  assert.equal(fm.name, "merlin");
  assert.match(fm.description as string, /Merlin — planner/);
  assert.match(content, /# Merlin\nPlan deliberately/);
});

test("Cursor compiler passes model through if specified", () => {
  const soulWithModel: SoulFile = {
    ...soul,
    model: "claude-3-5-sonnet",
  };
  const compiled = cursorCompiler.compile(soulWithModel, context);
  const { data: fm } = matter(compiled.content);
  assert.equal(fm.model, "claude-3-5-sonnet");
});

test("Cursor compiler is registered and detects .cursor", async () => {
  assert.ok(ALL_COMPILERS.some((compiler) => compiler.id === "cursor"));
  assert.equal(getCompiler("cursor").label, "Cursor");

  const dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), "hocus-cursor-detect-"));
  try {
    assert.equal(await cursorCompiler.detect(dir), false);
    await fsExtra.mkdir(path.join(dir, ".cursor"));
    assert.equal(await cursorCompiler.detect(dir), true);
  } finally {
    await fsExtra.rm(dir, { recursive: true, force: true });
  }
});
