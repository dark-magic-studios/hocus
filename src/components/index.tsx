import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import type { BootTask } from './boot/useBootTasks.js';

export interface LaunchOptions {
  cwd?: string;
  version: string;
  silent?: boolean;
}

// TODO(DMS): replace with the real counts from loadDeck / detectStack.
function defaultBootTasks(): BootTask[] {
  return [
    { id: 'spellbooks', label: ' loading spellbooks', run: async () => '0 active' },
    { id: 'souls', label: ' loading souls', run: async () => '0 bound' },
    { id: 'wards', label: ' scanning wards', run: async () => 'none detected' },
    { id: 'circle', label: ' the circle is complete', run: async () => '' },
  ];
}

export function launchTui(opts: LaunchOptions) {
  if (!process.stdout.isTTY) {
    throw new Error('hocus: the command deck needs an interactive terminal. use `hocus --help` for the CLI.');
  }

  const { waitUntilExit } = render(
    <App
      cwd={opts.cwd ?? process.cwd()}
      version={opts.version}
      silentBoot={opts.silent ?? false}
      bootTasks={defaultBootTasks()}
    />,
    { exitOnCtrlC: false },
  );

  return waitUntilExit();
}
