import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
const { mkdtemp, rm, mkdir } = fsExtra;
import os from "node:os";
import matter from "gray-matter";
import { commandCodeCompiler } from "../src/compilers/command-code.js";
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

test("command-code compiler is registered and reachable via getCompiler", () => {
  assert.ok(ALL_COMPILERS.some((c) => c.id === "command-code"));
  assert.equal(getCompiler("command-code").label, "Command Code");
});

test("command-code compiler emits native frontmatter with taste instructions", () => {
  const compiled = commandCodeCompiler.compile(makeSoul(), CTX);

  assert.equal(compiled.relPath, path.join(".commandcode", "agents", "merlin.md"));

  const { data, content } = matter(compiled.content);
  assert.equal(data.name, "merlin");
  assert.match(data.description, /Merlin — planner/);
  assert.match(data.description, /Use for: planning, architecture/);
  assert.equal(data.tools, "read_file, grep, glob");
  assert.match(content, /Breaks goals into phases/);
  assert.match(content, /Taste compatibility \(Command Code\)/);
  assert.match(content, /\.commandcode\/taste\/taste\.md/);
});

test("command-code compiler maps hocus tool names to Command Code tool ids", () => {
  const compiled = commandCodeCompiler.compile(
    makeSoul({ tools: ["read", "grep", "bash", "write", "mcp__github__get_me"] }),
    CTX,
  );
  const { data } = matter(compiled.content);
  assert.equal(data.tools, "read_file, grep, shell_command, write_file, mcp__github__get_me");
});

test("command-code compiler passes model through", () => {
  const compiled = commandCodeCompiler.compile(makeSoul({ model: "claude-sonnet-4-6" }), CTX);
  const { data } = matter(compiled.content);
  assert.equal(data.model, "claude-sonnet-4-6");
});

test("command-code compiler detects an existing .commandcode directory", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hocus-cmdc-detect-"));
  try {
    assert.equal(await commandCodeCompiler.detect(dir), false);
    await mkdir(path.join(dir, ".commandcode"));
    assert.equal(await commandCodeCompiler.detect(dir), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
