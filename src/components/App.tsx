import React, { useEffect, useState } from 'react';
import { useApp, useInput } from 'ink';
import { BootSequence } from './boot/BootSequence.js';
import type { BootTask } from './boot/useBootTasks.js';
import { Frame } from './components/Frame.js';
import { DeckProvider } from './state/DeckContext.js';
import { useTabs, type TabId } from './hooks/useTabs.js';
import { SpellsTab } from './tabs/SpellsTab.js';
import { SoulsTab } from './tabs/SoulsTab.js';
import { CovenTab } from './tabs/CovenTab.js';
import { GrimoireTab } from './tabs/GrimoireTab.js';
import { ScryingTab } from './tabs/ScryingTab.js';

const PANES: Record<TabId, React.ComponentType> = {
  spells: SpellsTab,
  souls: SoulsTab,
  coven: CovenTab,
  grimoire: GrimoireTab,
  scrying: ScryingTab,
};

const HINTS: Record<TabId, string[]> = {
  spells: ['↑↓ navigate', '⏎ open', 'a assign', '? keys', 'q quit'],
  souls: ['↑↓ navigate', '⏎ edit', 'w write', 'r recompile', 'q quit'],
  coven: ['↑↓ navigate', '⏎ inspect', 'n spawn familiar', 'x dismiss', 'q quit'],
  grimoire: ['↑↓ navigate', 'space toggle', 'i install pack', 'q quit'],
  scrying: ['↑↓ scroll', 'f follow', 'c clear', 'q quit'],
};

export interface AppProps {
  cwd: string;
  version: string;
  silentBoot: boolean;
  bootTasks: BootTask[];
}

export function App({ cwd, version, silentBoot, bootTasks }: AppProps) {
  const { exit } = useApp();
  const [booted, setBooted] = useState(silentBoot);
  const { active, next, prev, byIndex } = useTabs();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useInput((input, key) => {
    if (!booted) return;
    if (input === 'q' || (key.ctrl && input === 'c')) { exit(); return; }
    if (key.tab) { key.shift ? prev() : next(); return; }
    const n = Number.parseInt(input, 10);
    if (!Number.isNaN(n)) byIndex(n);
  });

  if (!booted) {
    return (
      <BootSequence
        version={version}
        tasks={bootTasks}
        silent={silentBoot}
        onDone={() => setBooted(true)}
      />
    );
  }

  const Pane = PANES[active];

  return (
    <DeckProvider cwd={cwd}>
      <Frame active={active} clock={clock} hints={HINTS[active]}>
        <Pane />
      </Frame>
    </DeckProvider>
  );
}
