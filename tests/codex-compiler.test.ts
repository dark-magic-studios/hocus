import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
import os from "node:os";
import { codexCompiler } from "../src/compilers/codex.js";
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
  body: "Plan deliberately and delegate bounded work.",
};

const context = { repoRoot: "/repo", stack: { languages: [], frameworks: [] } };

test("Codex compiler emits a project-scoped custom-agent TOML file", () => {
  const compiled = codexCompiler.compile(soul, context);
  assert.equal(compiled.relPath, path.join(".codex", "agents", "merlin.toml"));
  assert.match(compiled.content, /^name = "merlin"$/m);
  assert.match(compiled.content, /^description = "Merlin — planner\. Use for: planning, architecture\."$/m);
  assert.match(compiled.content, /developer_instructions = \"\"\"\nPlan deliberately/);
});

test("Codex compiler is registered and detects .codex", async () => {
  assert.ok(ALL_COMPILERS.some((compiler) => compiler.id === "codex"));
  assert.equal(getCompiler("codex").label, "Codex");

  const dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), "hocus-codex-detect-"));
  try {
    assert.equal(await codexCompiler.detect(dir), false);
    await fsExtra.mkdir(path.join(dir, ".codex"));
    assert.equal(await codexCompiler.detect(dir), true);
  } finally {
    await fsExtra.rm(dir, { recursive: true, force: true });
  }
});
