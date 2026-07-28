import { useEffect, useState } from 'react';

export interface BootTask {
  id: string;
  label: string;
  run: () => Promise<string>;
}

export interface BootLine {
  id: string;
  label: string;
  result?: string;
  failed?: boolean;
}

const STAGGER_MS = 160;

export function useBootTasks(tasks: BootTask[], skip: boolean) {
  const [lines, setLines] = useState<BootLine[]>([]);
  const [done, setDone] = useState(skip);

  useEffect(() => {
    if (skip) { setDone(true); return; }
    let cancelled = false;

    (async () => {
      for (const task of tasks) {
        if (cancelled) return;
        setLines((prev) => [...prev, { id: task.id, label: task.label }]);
        try {
          const result = await task.run();
          if (cancelled) return;
          setLines((prev) => prev.map((l) => (l.id === task.id ? { ...l, result } : l)));
        } catch (e) {
          if (cancelled) return;
          const msg = e instanceof Error ? e.message : 'failed';
          setLines((prev) => prev.map((l) => (l.id === task.id ? { ...l, result: msg, failed: true } : l)));
        }
        await new Promise((r) => setTimeout(r, STAGGER_MS));
      }
      if (!cancelled) setDone(true);
    })();

    return () => { cancelled = true; };
  }, [tasks, skip]);

  return { lines, done, finish: () => setDone(true) };
}
