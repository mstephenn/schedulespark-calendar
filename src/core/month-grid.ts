import type { CalendarEvent } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WORKWEEK_DAYS = 5;
const MONTH_GRID_WEEKS = 6;

/**
 * Returns true when a day falls in the anchor date's UTC month.
 */
export function isSameUtcMonth(day: Date, anchorDate: Date): boolean {
  return day.getUTCFullYear() === anchorDate.getUTCFullYear() && day.getUTCMonth() === anchorDate.getUTCMonth();
}

/**
 * Returns events that overlap a UTC calendar day.
 */
export function getEventsForUtcDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfUtcDay(day);
  const dayEnd = addUtcDays(dayStart, 1);
  return events
    .filter((event) => intervalsOverlap(event.start, event.end, dayStart, dayEnd))
    .sort((left, right) => left.start.getTime() - right.start.getTime());
}

/**
 * Buckets events by UTC calendar day for month grids and other multi-day views.
 * Each day bucket is sorted by start time.
 */
export function indexEventsByUtcDay(events: CalendarEvent[], days: Date[]): Map<number, CalendarEvent[]> {
  const dayBounds = days.map((day) => {
    const dayStart = startOfUtcDay(day);
    return { key: dayStart.getTime(), dayStart, dayEnd: addUtcDays(dayStart, 1) };
  });

  const buckets = new Map<number, CalendarEvent[]>();
  for (const bounds of dayBounds) {
    buckets.set(bounds.key, []);
  }

  for (const event of events) {
    for (const bounds of dayBounds) {
      if (intervalsOverlap(event.start, event.end, bounds.dayStart, bounds.dayEnd)) {
        buckets.get(bounds.key)?.push(event);
      }
    }
  }

  for (const bucket of buckets.values()) {
    bucket.sort((left, right) => left.start.getTime() - right.start.getTime());
  }

  return buckets;
}

/**
 * Builds the fixed six-week month grid that contains the anchor month.
 */
export function getMonthGridDays(anchorDate: Date, weekStartsOn: number): Date[] {
  const monthStart = startOfUtcMonth(anchorDate);
  const gridStart = startOfUtcWeek(monthStart, weekStartsOn);
  return Array.from({ length: MONTH_GRID_WEEKS * 7 }, (_, index) => addUtcDays(gridStart, index));
}

/**
 * Returns the Monday-based work-week start for a selected date.
 * Weekend dates advance to the next Monday work week.
 */
export function startOfWorkWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay();
  if (weekday === 6) return addUtcDays(day, 2);
  if (weekday === 0) return addUtcDays(day, 1);
  return startOfUtcWeek(day, 1);
}

/**
 * Returns midnight UTC for the provided date.
 */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Returns the UTC week start for a date.
 */
export function startOfUtcWeek(date: Date, weekStartsOn: number): Date {
  const diff = (date.getUTCDay() - weekStartsOn + 7) % 7;
  return addUtcDays(date, -diff);
}

/**
 * Returns the number of days shown in a time-grid view.
 */
export function getTimeGridDayCount(view: "day" | "week" | "workweek"): number {
  if (view === "day") return 1;
  if (view === "workweek") return WORKWEEK_DAYS;
  return 7;
}

/**
 * Returns true for views that use the time-grid body.
 */
export function isTimeGridView(view: string): view is "day" | "week" | "workweek" {
  return view === "day" || view === "week" || view === "workweek";
}

/* eslint-disable jsdoc/require-jsdoc -- month-grid internal helpers */
function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function intervalsOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}
