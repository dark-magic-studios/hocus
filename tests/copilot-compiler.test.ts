import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fsExtra from "fs-extra";
const { mkdtemp, rm, mkdir } = fsExtra;
import os from "node:os";
import matter from "gray-matter";
import { copilotCompiler } from "../src/compilers/copilot.js";
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

test("copilot compiler is registered and reachable via getCompiler", () => {
  assert.ok(ALL_COMPILERS.some((c) => c.id === "copilot"));
  assert.equal(getCompiler("copilot").label, "GitHub Copilot");
});

test("copilot compiler emits native .agent.md frontmatter", () => {
  const compiled = copilotCompiler.compile(makeSoul(), CTX);

  assert.equal(compiled.relPath, path.join(".github", "agents", "merlin.agent.md"));

  const { data, content } = matter(compiled.content);
  assert.equal(data.name, "merlin");
  assert.match(data.description, /Merlin — planner/);
  assert.match(data.description, /Use for: planning, architecture/);
  assert.deepEqual(data.tools, ["read", "search"]);
  assert.match(content, /Breaks goals into phases/);
});

test("copilot compiler maps hocus tool names to GitHub Copilot tool aliases", () => {
  const compiled = copilotCompiler.compile(
    makeSoul({ tools: ["read", "view", "grep", "glob", "bash", "edit", "write", "agent", "web", "mcp__github__get_issue"] }),
    CTX,
  );
  const { data } = matter(compiled.content);
  assert.deepEqual(data.tools, [
    "read",
    "search",
    "execute",
    "edit",
    "agent",
    "web",
    "mcp__github__get_issue",
  ]);
});

test("copilot compiler passes model through", () => {
  const compiled = copilotCompiler.compile(makeSoul({ model: "gpt-5.4" }), CTX);
  const { data } = matter(compiled.content);
  assert.equal(data.model, "gpt-5.4");
});

test("copilot compiler detects an existing .github/agents or .copilot directory", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hocus-copilot-detect-"));
  try {
    assert.equal(await copilotCompiler.detect(dir), false);
    await mkdir(path.join(dir, ".copilot"));
    assert.equal(await copilotCompiler.detect(dir), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
