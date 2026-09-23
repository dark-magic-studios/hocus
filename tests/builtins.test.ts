import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fsExtra from "fs-extra";
import { runBuiltin } from "../src/tui/chat/builtins.js";

async function makeScriptRepo(): Promise<string> {
  const dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), "hocus-builtins-"));
  await fsExtra.writeJson(path.join(dir, "package.json"), {
    name: "builtins-fixture",
    private: true,
    scripts: { echoargs: "node print-args.js" },
  });
  await fsExtra.writeFile(
    path.join(dir, "print-args.js"),
    'require("fs").writeFileSync("args.json", JSON.stringify(process.argv.slice(2)));\n',
  );
  return dir;
}

for (const [name, args] of [
  ["echoargs", ["foo; echo PWNED"]],
  ["run", ["echoargs", "foo; echo PWNED"]],
] as const) {
  test(`/${name} passes shell metacharacters literally to the script`, async () => {
    const dir = await makeScriptRepo();
    try {
      const result = await runBuiltin(name, [...args], { cwd: dir });
      assert.equal(result.ok, true, result.lines.join("\n"));
      const received = await fsExtra.readJson(path.join(dir, "args.json"));
      assert.deepEqual(received, ["foo; echo PWNED"]);
      assert.ok(
        !result.lines.some((line) => line.trim() === "PWNED"),
        `a second command ran:\n${result.lines.join("\n")}`,
      );
    } finally {
      await fsExtra.rm(dir, { recursive: true, force: true });
    }
  });
}

test("unknown commands are spawned without a shell", async () => {
  const dir = await makeScriptRepo();
  try {
    const result = await runBuiltin("node", ["-e", "console.log(process.argv[1])", "a; echo PWNED"], { cwd: dir });
    assert.equal(result.ok, true, result.lines.join("\n"));
    assert.deepEqual(result.lines, ["a; echo PWNED"]);
  } finally {
    await fsExtra.rm(dir, { recursive: true, force: true });
  }
});
