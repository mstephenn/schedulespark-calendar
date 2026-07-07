import type { BusinessHours } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

/* eslint-disable jsdoc/require-jsdoc -- shared day-bound constants */
export const FULL_DAY_HOURS: BusinessHours = { start: "00:00", end: "24:00" };

/**
 * Resolves the visible UTC interval for one calendar day from HH:mm bounds.
 * Use `end: "24:00"` for an exclusive midnight boundary at the start of the next day.
 */
export function resolveDayBounds(day: Date, hours: BusinessHours): { start: Date; end: Date } {
  const start = applyTime(day, hours.start);
  const end = isEndOfDay(hours.end) ? addUtcDays(startOfUtcDay(day), 1) : applyTime(day, hours.end);
  if (end <= start) {
    throw new Error(`Invalid business hours: end must be after start (${hours.start} - ${hours.end})`);
  }
  return { start, end };
}

/**
 * Applies a HH:mm time string to a UTC calendar day.
 */
function applyTime(day: Date, value: string): Date {
  const [hour = "0", minute = "0"] = value.split(":");
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      Number(hour),
      Number(minute)
    )
  );
}

/**
 * Returns midnight UTC for the provided date.
 */
function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Adds whole UTC days to a date.
 */
function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Returns true when the configured end time means the end of the UTC day.
 */
function isEndOfDay(value: string): boolean {
  return value === "24:00" || value === "24:00:00";
}
