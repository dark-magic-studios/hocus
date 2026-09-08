import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Creates an isolated tmp repo with one of everything loadDeck reads. */
export function makePopulatedRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hocus-tui-test-"));

  fs.mkdirSync(path.join(dir, ".hocus", "personas"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".hocus", "personas", "test-agent.soul.md"),
    [
      "---",
      "character: test-agent",
      "display_name: Test Agent",
      "role: tester",
      "voice: calm",
      'glyph: "[t]"',
      "triggers: []",
      "---",
      "",
      "Body.",
      "",
    ].join("\n"),
  );

  fs.mkdirSync(path.join(dir, "_potions"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "_potions", "test-potion.md"),
    ["---", "potion: DMS-1", "feature: Test Feature", "status: casting", "progress: 40", "---", "", "Body", ""].join(
      "\n",
    ),
  );

  fs.mkdirSync(path.join(dir, ".claude", "skills", "test-skill"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude", "skills", "test-skill", "SKILL.md"),
    ["---", "name: test-skill", "description: A test skill.", "---", "", "Body", ""].join("\n"),
  );

  fs.mkdirSync(path.join(dir, ".claude", "agents"), { recursive: true });

  fs.mkdirSync(path.join(dir, ".hocus"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".hocus", "ledger.jsonl"),
    `${JSON.stringify({
      at: "12:00:00",
      agentId: "test-agent",
      event: "test-event",
      tokensIn: 10,
      tokensOut: 20,
      costUsd: 0.0012,
    })}\n`,
  );

  return dir;
}

export function makeEmptyRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hocus-tui-test-empty-"));
}

export function cleanupRepo(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
