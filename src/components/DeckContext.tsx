import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { DeckData } from './types.js';
import { loadDeck } from './loadDeck.js';

interface DeckState {
  data: DeckData;
  loading: boolean;
  error?: Error;
  reload: () => void;
}

const EMPTY: DeckData = { agents: [], spells: [], skills: [], wards: [], ledger: [] };

const DeckContext = createContext<DeckState | null>(null);

export function DeckProvider({ cwd, children }: { cwd: string; children: React.ReactNode }) {
  const [data, setData] = useState<DeckData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDeck(cwd)
      .then((d) => { if (!cancelled) { setData(d); setError(undefined); } })
      .catch((e: unknown) => { if (!cancelled) setError(e as Error); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cwd, nonce]);

  const value = useMemo<DeckState>(
    () => ({ data, loading, error, reload: () => setNonce((n) => n + 1) }),
    [data, loading, error],
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck(): DeckState {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error('useDeck must be used inside <DeckProvider>');
  return ctx;
}
