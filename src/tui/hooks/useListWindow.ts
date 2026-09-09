import { useCallback, useEffect, useState } from 'react';
import { useTerminalSize } from './useTerminalSize.js';

const FRAME_CHROME = 10;

export interface ListWindowOptions {
  /** Rows reserved for headers, status lines, etc. inside the tab pane. */
  reservedRows?: number;
  /** Visual lines each list item occupies (grimoire uses 2). */
  linesPerItem?: number;
}

export function useListWindow(itemCount: number, options: ListWindowOptions = {}) {
  const { reservedRows = 0, linesPerItem = 1 } = options;
  const { rows } = useTerminalSize();
  const rawWindow = Math.max(3, rows - FRAME_CHROME - reservedRows);
  const windowSize = Math.max(1, Math.floor(rawWindow / linesPerItem));

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    if (itemCount === 0) {
      setSelectedIndex(0);
      setWindowStart(0);
    } else if (selectedIndex >= itemCount) {
      setSelectedIndex(itemCount - 1);
    }
  }, [itemCount, selectedIndex]);

  const ensureVisible = useCallback(
    (index: number, start: number) => {
      if (index < start) return index;
      if (index >= start + windowSize) return index - windowSize + 1;
      return start;
    },
    [windowSize],
  );

  const move = useCallback(
    (delta: number) => {
      if (itemCount === 0) return;
      setSelectedIndex((prev) => {
        const next = Math.max(0, Math.min(itemCount - 1, prev + delta));
        setWindowStart((start) => ensureVisible(next, start));
        return next;
      });
    },
    [itemCount, ensureVisible],
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
