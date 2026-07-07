import type { CalendarEvent, CalendarResource } from "./types";

/**
 * Formats a UTC calendar date for screen-reader labels.
 */
export function formatUtcDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long"
  }).format(date);
}

/**
 * Formats a UTC weekday for month column headers.
 */
export function formatUtcWeekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long"
  }).format(date);
}

/**
 * Formats a UTC clock time for screen-reader labels.
 */
export function formatUtcTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

/**
 * Formats an event's UTC time range for screen-reader labels.
 */
export function formatUtcTimeRangeLabel(start: Date, end: Date): string {
  return `${formatUtcTimeLabel(start)} to ${formatUtcTimeLabel(end)}`;
}

/**
 * Builds a date or resource column label.
 */
export function getColumnLabel(column: Date | CalendarResource): string {
  if (column instanceof Date) return formatUtcDateLabel(column);
  return column.subtitle ? `${column.title}, ${column.subtitle}` : column.title;
}

/**
 * Builds a stable event label with title, date, time, and optional resource context.
 */
export function getEventLabel(event: CalendarEvent, resources: CalendarResource[] = []): string {
  const resource = event.resourceId ? resources.find((item) => item.id === event.resourceId) : undefined;
  const date = formatUtcDateLabel(event.start);
  const time = event.allDay ? "all day" : formatUtcTimeRangeLabel(event.start, event.end);
  return [event.title, date, time, resource?.title].filter(Boolean).join(", ");
}

/**
 * Builds a month day cell label with the visible event count.
 */
export function getMonthCellLabel(day: Date, eventCount: number): string {
  const suffix = eventCount === 1 ? "1 event" : `${String(eventCount)} events`;
  return `${formatUtcDateLabel(day)}, ${suffix}`;
}
