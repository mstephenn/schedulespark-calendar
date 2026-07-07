import { resolveDayBounds } from "./day-bounds";
import {
  getMonthGridDays,
  getTimeGridDayCount,
  startOfUtcDay,
  startOfUtcWeek,
  startOfWorkWeek
} from "./month-grid";

import type {
  BusinessHours,
  CalendarEvent,
  CalendarView,
  EventLayout,
  TimeSlot,
  VisibleRange
} from "../types";

export { FULL_DAY_HOURS, resolveDayBounds } from "./day-bounds";
export { COLUMN_MIN_WIDTH_PX, getSlotHeightPx, SLOT_HEIGHT_COMPACT_PX, SLOT_HEIGHT_PX } from "./density";

interface VisibleRangeInput {
  date: Date;
  view: CalendarView;
  weekStartsOn?: number;
}

interface GenerateSlotsInput {
  day: Date;
  businessHours: BusinessHours;
  slotMinutes: number;
}

interface LayoutEventsInput {
  events: CalendarEvent[];
  range: VisibleRange;
  businessHours: BusinessHours;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WEEK_START = 1;

/**
 * Returns the visible range for day, week, work-week, or month views.
 */
export function getVisibleRange(input: VisibleRangeInput): VisibleRange {
  const selectedDay = startOfUtcDay(input.date);
  const weekStartsOn = input.weekStartsOn ?? DEFAULT_WEEK_START;

  if (input.view === "month") {
    const days = getMonthGridDays(selectedDay, weekStartsOn);
    return {
      start: days[0] ?? selectedDay,
      end: addDays(days.at(-1) ?? selectedDay, 1),
      days,
      view: "month"
    };
  }

  const start =
    input.view === "day"
      ? selectedDay
      : input.view === "workweek"
        ? startOfWorkWeek(selectedDay)
        : startOfUtcWeek(selectedDay, weekStartsOn);
  const dayCount = getTimeGridDayCount(input.view);
  const days = Array.from({ length: dayCount }, (_, index) => addDays(start, index));

  return {
    start,
    end: addDays(start, dayCount),
    days,
    view: input.view
  };
}

/**
 * Generates fixed-size slots for one calendar day.
 */
export function generateTimeSlots(input: GenerateSlotsInput): TimeSlot[] {
  assertPositiveSlotMinutes(input.slotMinutes);

  const { start, end } = resolveDayBounds(input.day, input.businessHours);
  const slots: TimeSlot[] = [];

  for (let slotStart = start.getTime(); slotStart < end.getTime(); slotStart += input.slotMinutes * 60_000) {
    slots.push({
      start: new Date(slotStart),
      end: new Date(slotStart + input.slotMinutes * 60_000)
    });
  }

  return slots;
}

/**
 * Computes percentage positions for events in the visible range.
 */
export function layoutEvents(input: LayoutEventsInput): EventLayout[] {
  const dayContexts = input.range.days.map((day, dayIndex) => {
    const { start, end } = resolveDayBounds(day, input.businessHours);
    return {
      dayIndex,
      dayStart: start,
      dayEnd: end,
      totalMinutes: minutesBetween(start, end)
    };
  });

  const layouts: EventLayout[] = [];

  for (const event of input.events) {
    for (const dayContext of dayContexts) {
      if (!intervalsOverlap(event.start, event.end, dayContext.dayStart, dayContext.dayEnd)) continue;

      const clippedStart = new Date(Math.max(event.start.getTime(), dayContext.dayStart.getTime()));
      const clippedEnd = new Date(Math.min(event.end.getTime(), dayContext.dayEnd.getTime()));
      if (clippedEnd <= clippedStart) continue;

      layouts.push({
        event,
        eventId: event.id,
        dayIndex: dayContext.dayIndex,
        topPercent: (minutesBetween(dayContext.dayStart, clippedStart) / dayContext.totalMinutes) * 100,
        heightPercent: (minutesBetween(clippedStart, clippedEnd) / dayContext.totalMinutes) * 100
      });
    }
  }

  return layouts;
}

/**
 * Returns a UTC day name used by the default header renderer.
 */
export function formatWeekday(day: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short"
  }).format(day);
}

/**
 * Returns the UTC calendar day number for column headers.
 */
export function formatDayNumber(day: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    day: "numeric"
  }).format(day);
}

/**
 * Compares two dates by UTC calendar day.
 */
export function isSameUtcDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

/**
 * Returns the vertical position of the current-time indicator as a percentage of business hours, or null when hidden.
 */
export function getCurrentTimeIndicatorPercent(
  day: Date,
  businessHours: BusinessHours,
  now: Date
): number | null {
  if (!isSameUtcDay(day, now)) return null;

  const { start: dayStart, end: dayEnd } = resolveDayBounds(day, businessHours);
  if (now < dayStart || now >= dayEnd) return null;

  const totalMinutes = minutesBetween(dayStart, dayEnd);
  return (minutesBetween(dayStart, now) / totalMinutes) * 100;
}

/**
 * Adds whole UTC days to a date.
 */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Returns the minute distance between two dates.
 */
function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60_000;
}

/**
 * Checks whether two half-open time intervals overlap.
 */
function intervalsOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date
): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

/**
 * Prevents non-advancing slot generation loops.
 */
function assertPositiveSlotMinutes(slotMinutes: number): void {
  if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) {
    throw new Error("slotMinutes must be a positive number");
  }
}
