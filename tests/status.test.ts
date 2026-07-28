import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeEmptyRepo, makePopulatedRepo, cleanupRepo } from "./tui-fixtures.js";
import { getHocusStatus } from "../src/utils/status.js";
import { renderDashboard } from "../src/templates/dashboard.js";
import { runBuiltin } from "../src/tui/chat/builtins.js";

test("getHocusStatus detects uninstalled empty repo", async () => {
  const dir = makeEmptyRepo();
  try {
    const status = await getHocusStatus(dir);
    assert.equal(status.installed, false);
    assert.equal(status.agentCount, 0);
    assert.equal(status.isUpToDate, false);
    assert.match(status.statusMessage, /Not installed/);
  } finally {
    cleanupRepo(dir);
  }
});

test("getHocusStatus reports status for populated repo", async () => {
  const dir = makePopulatedRepo();
  try {
    // Create dashboard.html so it can be up-to-date
    fs.writeFileSync(path.join(dir, "dashboard.html"), "<html></html>");
    const status = await getHocusStatus(dir);
    assert.equal(status.installed, true);
    assert.equal(status.agentCount, 1);
    assert.equal(status.skillCount, 1);
  } finally {
    cleanupRepo(dir);
  }
});

test("renderDashboard includes hocus status section", () => {
  const html = renderDashboard({
    projectName: "test-proj",
    personas: [],
    spells: [],
    skillsCount: 2,
    statusInfo: {
      installed: true,
      agentCount: 4,
      skillCount: 2,
      isUpToDate: true,
      statusMessage: "Up-to-date",
    },
  });

  assert.match(html, /\/\/ hocus status/);
  assert.match(html, /Up-to-date/);
  assert.match(html, /4/);
  assert.match(html, /2 skill/);
});

test("runBuiltin handles /status command", async () => {
  const dir = makePopulatedRepo();
  try {
    const res = await runBuiltin("status", [], { cwd: dir });
    assert.equal(res.ok, true);
    const text = res.lines.join("\n");
    assert.match(text, /hocus status/);
    assert.match(text, /agents: 1/);
  } finally {
    cleanupRepo(dir);
  }
});

test("runBuiltin executes package.json scripts", async () => {
  const dir = makeEmptyRepo();
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "dummy",
        scripts: {
          echo: "echo hello-script",
        },
      }),
    );
    const res = await runBuiltin("echo", [], { cwd: dir });
    assert.equal(res.ok, true);
    assert.match(res.lines.join("\n"), /hello-script/);
  } finally {
    cleanupRepo(dir);
  }
});
