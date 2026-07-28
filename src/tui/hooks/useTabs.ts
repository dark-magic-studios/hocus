import { useCallback, useState } from 'react';

export const TAB_IDS = ['spells', 'souls', 'coven', 'grimoire', 'scrying', 'seance'] as const;
export type TabId = (typeof TAB_IDS)[number];

export function useTabs(initial: TabId = 'spells') {
  const [active, setActive] = useState<TabId>(initial);

  const next = useCallback(() => {
    setActive((cur) => TAB_IDS[(TAB_IDS.indexOf(cur) + 1) % TAB_IDS.length]!);
  }, []);

  const prev = useCallback(() => {
    setActive((cur) => TAB_IDS[(TAB_IDS.indexOf(cur) + TAB_IDS.length - 1) % TAB_IDS.length]!);
  }, []);

  const byIndex = useCallback((n: number) => {
    const id = TAB_IDS[n - 1];
    if (id) setActive(id);
  }, []);

  return { active, setActive, next, prev, byIndex };
}
