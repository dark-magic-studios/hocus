import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { loadDeck } from './state/loadDeck.js';
import { detectStack } from '../scanners/detect-stack.js';
import type { BootTask } from './boot/useBootTasks.js';
import type { DeckData } from './state/types.js';
import type { DetectedStack } from '../compilers/types.js';

export interface LaunchOptions {
  cwd?: string;
  version: string;
  silent?: boolean;
}

function buildBootTasks(deck: DeckData, stack: DetectedStack): BootTask[] {
  const activeSpells = deck.spells.filter((s) => s.status === 'casting' || s.status === 'blocked').length;
  const detectedWards = deck.wards.filter((w) => w.detected).length;
  const stackSummary = [...stack.languages, ...stack.frameworks].join(', ');
  const wardsResult = stackSummary
    ? `${stackSummary} · ${detectedWards} target${detectedWards === 1 ? '' : 's'}`
    : detectedWards > 0
      ? `${detectedWards} target${detectedWards === 1 ? '' : 's'} detected`
      : 'none detected';

  return [
    {
      id: 'spellbooks',
      label: ' loading spellbooks',
      run: async () => `${activeSpells} active`,
    },
    {
      id: 'souls',
      label: ' loading souls',
      run: async () => `${deck.agents.length} bound`,
    },
    {
      id: 'wards',
      label: ' scanning wards',
      run: async () => wardsResult,
    },
    {
      id: 'circle',
      label: ' the circle is complete',
      run: async () => (deck.warnings.length > 0 ? `${deck.warnings.length} warning${deck.warnings.length === 1 ? '' : 's'}` : ''),
    },
  ];
}

function printPlainSummary(deck: DeckData, stack: DetectedStack): void {
  const stackSummary = [...stack.languages, ...stack.frameworks].join(', ') || 'none detected';
  const detectedWards = deck.wards.filter((w) => w.detected).length;
  const lines = [
    `hocus — ${deck.agents.length} soul(s), ${deck.spells.length} spell(s), ${deck.skills.length} skill(s)`,
    `stack: ${stackSummary}`,
    `wards: ${detectedWards}/${deck.wards.length} target(s) detected`,
    `ledger: ${deck.ledger.length} entr${deck.ledger.length === 1 ? 'y' : 'ies'}`,
  ];
  if (deck.warnings.length > 0) {
    lines.push(`warnings: ${deck.warnings.length}`);
  }
  for (const line of lines) process.stdout.write(`${line}\n`);
}

export async function launchTui(opts: LaunchOptions) {
  const cwd = opts.cwd ?? process.cwd();
  const silent = opts.silent ?? false;

  if (!process.stdout.isTTY) {
    // A non-interactive terminal can't host the ritual, but --silent asks
    // for a clean, scriptable status line rather than a hard failure — the
    // two only diverge here.
    if (!silent) {
      throw new Error('hocus: the command deck needs an interactive terminal. use `hocus --help` for the CLI.');
    }
    const [deck, stack] = await Promise.all([loadDeck(cwd), detectStack(cwd)]);
    printPlainSummary(deck, stack);
    return;
  }

  const [deck, stack] = await Promise.all([loadDeck(cwd), detectStack(cwd)]);

  const { waitUntilExit } = render(
    <App
      cwd={cwd}
      version={opts.version}
      silentBoot={silent}
      bootTasks={buildBootTasks(deck, stack)}
    />,
    { exitOnCtrlC: false },
  );

  return waitUntilExit();
}
