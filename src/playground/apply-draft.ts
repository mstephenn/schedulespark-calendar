import { expandRecurrenceEvents } from "../core/recurrence";

import type { CalendarDraftChange, CalendarEvent } from "../types";

/**
 * Applies a calendar interaction draft to the playground event list.
 */
export function applyDraftToEvents(events: CalendarEvent[], change: CalendarDraftChange): CalendarEvent[] {
  const directIndex = events.findIndex((event) => event.id === change.eventId);
  if (directIndex !== -1) {
    return events.map((event, index) => (index === directIndex ? patchEvent(event, change) : event));
  }

  const separator = change.eventId.indexOf(":");
  if (separator === -1) return events;

  const masterId = change.eventId.slice(0, separator);
  const masterIndex = events.findIndex((event) => event.id === masterId);
  if (masterIndex === -1) return events;

  const master = events[masterIndex];
  if (!master.recurrenceRule) return events;

  const occurrenceStart = new Date(change.eventId.slice(separator + 1));
  const rangeStart = addUtcDays(occurrenceStart, -14);
  const rangeEnd = addUtcDays(occurrenceStart, 14);
  const materialized = expandRecurrenceEvents({
    events: [master],
    rangeStart,
    rangeEnd
  }).map((event) => (event.id === change.eventId ? patchEvent(event, change) : event));

  return [...events.slice(0, masterIndex), ...materialized, ...events.slice(masterIndex + 1)];
}

/**
 * Patches one event with draft start, end, and resource values.
 */
function patchEvent(event: CalendarEvent, change: CalendarDraftChange): CalendarEvent {
  return {
    ...event,
    start: change.start,
    end: change.end,
    resourceId: change.resourceId ?? event.resourceId
  };
}

/**
 * Shifts a UTC date by the given number of days.
 */
function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
