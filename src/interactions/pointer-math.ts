/* eslint-disable jsdoc/require-jsdoc -- Private pointer-math helpers stay documented at the exported-function level only. */

/** Fallback column width used when a column's real width can't be measured (e.g. in a test environment). */
export const COLUMN_WIDTH_PX = 120;

/**
 * Converts pointer movement into day and minute deltas for interaction math.
 */
export function getInteractionDelta(
  start: { clientX: number; clientY: number; columnWidthPx: number; slotHeightPx: number },
  end: { clientX: number; clientY: number },
  slotMinutes: number
): { dayDelta: number; minuteDelta: number } {
  return {
    dayDelta: Math.round((end.clientX - start.clientX) / start.columnWidthPx),
    minuteDelta: Math.round((end.clientY - start.clientY) / start.slotHeightPx) * slotMinutes
  };
}

/**
 * Captures pointer events on `target` for the duration of a drag, when supported.
 */
export function capturePointer(target: HTMLElement, pointerId: number): void {
  if ("setPointerCapture" in target) target.setPointerCapture(pointerId);
}

/**
 * Releases a previously captured pointer, when supported and currently captured.
 */
export function releasePointer(target: HTMLElement, pointerId: number): void {
  if ("hasPointerCapture" in target && target.hasPointerCapture(pointerId)) {
    target.releasePointerCapture(pointerId);
  }
}

/**
 * Measures a day/resource column's rendered width, falling back to a fixed width when
 * the real layout can't be measured (e.g. jsdom, which reports 0 for all layout boxes).
 */
export function measureColumnWidth(target: HTMLElement): number {
  const column = target.closest(".sscal__days")?.querySelector(".sscal__day-column");
  const width = column?.getBoundingClientRect().width;
  return width && width > 0 ? width : COLUMN_WIDTH_PX;
}
