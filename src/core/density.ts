/* eslint-disable jsdoc/require-jsdoc -- layout density constants for CSS and interaction math */

export const SLOT_HEIGHT_PX = 48;
export const SLOT_HEIGHT_COMPACT_PX = 32;
export const COLUMN_MIN_WIDTH_PX = 120;

/**
 * Resolves the slot row height used by layout CSS and pointer interaction math.
 */
export function getSlotHeightPx(compact: boolean): number {
  return compact ? SLOT_HEIGHT_COMPACT_PX : SLOT_HEIGHT_PX;
}
