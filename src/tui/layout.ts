/** Rows consumed by the frame border, header, tab bar, and footer. */
export const FRAME_CHROME_ROWS = 7;

/** Vertical padding inside the frame content pane (paddingY={1}). */
export const PANE_PADDING_ROWS = 2;

/** Usable rows for tab content (after chrome and padding). */
export function paneRows(totalRows: number): number {
  return Math.max(4, totalRows - FRAME_CHROME_ROWS - PANE_PADDING_ROWS);
}

/** Outer height of the content box (includes padding). */
export function paneBoxHeight(totalRows: number): number {
  return paneRows(totalRows) + PANE_PADDING_ROWS;
}
