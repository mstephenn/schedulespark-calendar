import type { CalendarEvent } from "../types";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{3,8}$/i;

/* eslint-disable jsdoc/require-jsdoc -- shared suggested color swatches */
export const SUGGESTED_EVENT_COLORS = [
  "#6264a7",
  "#107c10",
  "#0078d4",
  "#c239b3",
  "#8a8886",
  "#5b5fc7",
  "#e81123",
  "#ff8c00"
] as const;

/**
 * Resolves the explicit color for an event from consumer-provided data only.
 */
export function resolveEventColor(event: CalendarEvent, defaultEventColor?: string): string | undefined {
  if (event.color) return event.color;
  return defaultEventColor;
}

/**
 * Builds inline styles for a timed event block when a color is configured.
 */
export function getTimedEventStyle(color: string | undefined): { backgroundColor?: string } {
  if (!color) return {};
  return { backgroundColor: color };
}

/**
 * Builds inline styles for an all-day event chip when a color is configured.
 */
export function getAllDayEventStyle(color: string | undefined): { backgroundColor?: string } | undefined {
  if (!color) return undefined;
  return { backgroundColor: color };
}

/**
 * Builds inline styles for a month-view event chip when a color is configured.
 * Accepts hex colors or other CSS color values (e.g. `var(--brand)`, `rgb(...)`).
 * Hex input gets a fixed alpha-hex suffix for the background tint; non-hex input
 * is tinted via `color-mix()` instead, since alpha-hex suffixes aren't valid on
 * arbitrary CSS color syntax.
 */
export function getMonthEventStyle(color: string | undefined): { backgroundColor?: string; borderLeftColor?: string } | undefined {
  if (!color) return undefined;
  return {
    backgroundColor: HEX_COLOR_PATTERN.test(color) ? `${color}22` : `color-mix(in srgb, ${color} 13%, transparent)`,
    borderLeftColor: color
  };
}
