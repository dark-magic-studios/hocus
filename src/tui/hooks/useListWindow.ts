import { useCallback, useEffect, useState } from 'react';
import { paneRows } from '../layout.js';
import { useTerminalSize } from './useTerminalSize.js';

export interface ListWindowOptions {
  /** Rows reserved for headers, status lines, etc. inside the tab pane. */
  reservedRows?: number;
  /** Visual lines each list item occupies (grimoire uses 2). */
  linesPerItem?: number;
}

export function useListWindow(itemCount: number, options: ListWindowOptions = {}) {
  const { reservedRows = 0, linesPerItem = 1 } = options;
  const { rows } = useTerminalSize();
  const available = Math.max(1, paneRows(rows) - reservedRows);
  const windowSize = Math.max(1, Math.floor(available / linesPerItem));

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  const ensureVisible = useCallback(
    (index: number, start: number) => {
      if (index < start) return index;
      if (index >= start + windowSize) return index - windowSize + 1;
      return start;
    },
    [windowSize],
  );

  useEffect(() => {
    if (itemCount === 0) {
      setSelectedIndex(0);
      setWindowStart(0);
      return;
    }
    setSelectedIndex((prev) => (prev >= itemCount ? itemCount - 1 : prev));
  }, [itemCount]);

  useEffect(() => {
    setWindowStart((start) => ensureVisible(selectedIndex, start));
  }, [selectedIndex, ensureVisible]);

  const move = useCallback(
    (delta: number) => {
      if (itemCount === 0) return;
      setSelectedIndex((prev) => Math.max(0, Math.min(itemCount - 1, prev + delta)));
    },
    [itemCount],
  );

  const visibleEnd = Math.min(itemCount, windowStart + windowSize);
  const showingLabel =
    itemCount > 0 ? `${windowStart + 1}-${visibleEnd} of ${itemCount}` : '';

  return {
    selectedIndex,
    setSelectedIndex,
    windowStart,
    windowSize,
    visibleEnd,
    move,
    showingLabel,
  };
}
