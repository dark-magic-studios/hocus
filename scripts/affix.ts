#!/usr/bin/env node
/**
 * Standalone script to affix a persona soul to existing subagents.
 * Usage:
 *   npx tsx scripts/affix.ts [agent] [soul]
 * Example:
 *   npx tsx scripts/affix.ts orchestrator jared
 */
import { runAffix } from "../src/commands/affix.js";

const args = process.argv.slice(2);
const agent = args[0];
const soul = args[1];

runAffix({
  repoRoot: process.cwd(),
  agent,
  soul,
  interactive: !agent || !soul,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
