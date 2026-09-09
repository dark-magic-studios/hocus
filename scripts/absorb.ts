#!/usr/bin/env node
/**
 * Standalone script to absorb a persona and migrate dependent agents.
 * Usage:
 *   npx tsx scripts/absorb.ts <target-persona> [replacement-persona]
 * Example:
 *   npx tsx scripts/absorb.ts dinesh gilfoyle
 */
import { runAbsorb } from "../src/commands/absorb.js";

const args = process.argv.slice(2);
const persona = args[0];
const into = args[1];

if (!persona) {
  console.log("Usage: npx tsx scripts/absorb.ts <target-persona> [replacement-persona]");
  process.exit(1);
}

runAbsorb({
  repoRoot: process.cwd(),
  persona,
  into,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
