import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
import os from "node:os";
import { spawnSync } from "node:child_process";
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

test("Codex compiler emits valid TOML for bodies with backslashes and quotes", (t) => {
  const body = 'Match \\d+ in C:\\Users\\merlin.\nAvoid """triple""" and """"quad"""" quotes.\nEnd with a quote"';
  const compiled = codexCompiler.compile({ ...soul, body }, context);

  const probe = spawnSync("python3", ["-c", "import tomllib"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    t.skip("python3 with tomllib is not available");
    return;
  }
  const parsed = spawnSync(
    "python3",
    ["-c", "import tomllib,sys,json; print(json.dumps(tomllib.loads(sys.stdin.read())))"],
    { input: compiled.content, encoding: "utf8" },
  );
  assert.equal(parsed.status, 0, parsed.stderr);
  const decoded = JSON.parse(parsed.stdout) as Record<string, string>;
  assert.equal(decoded.developer_instructions, body);
  assert.equal(decoded.name, "merlin");
});
