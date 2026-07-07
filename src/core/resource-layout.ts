import { resolveDayBounds } from "./day-bounds";

import type { BusinessHours, CalendarEvent, CalendarResource, EventLayout } from "../types";

interface LayoutResourceEventsInput {
  day: Date;
  events: CalendarEvent[];
  resources: CalendarResource[];
  businessHours: BusinessHours;
}

/**
 * Computes percentage positions for same-day events assigned to known resources.
 */
export function layoutResourceEvents(input: LayoutResourceEventsInput): EventLayout[] {
  const resourceIndexById = new Map<string, number>();
  input.resources.forEach((resource, index) => {
    if (!resourceIndexById.has(resource.id)) resourceIndexById.set(resource.id, index);
  });
  const { start: dayStart, end: dayEnd } = resolveDayBounds(input.day, input.businessHours);
  const totalMinutes = minutesBetween(dayStart, dayEnd);
  const layouts: EventLayout[] = [];

  for (const event of input.events) {
    const resourceIndex = event.resourceId === undefined ? undefined : resourceIndexById.get(event.resourceId);
    if (resourceIndex === undefined) continue;
    if (!intervalsOverlap(event.start, event.end, dayStart, dayEnd)) continue;

    const clippedStart = new Date(Math.max(event.start.getTime(), dayStart.getTime()));
    const clippedEnd = new Date(Math.min(event.end.getTime(), dayEnd.getTime()));
    if (clippedEnd <= clippedStart) continue;

    layouts.push({
      event,
      eventId: event.id,
      dayIndex: 0,
      resourceIndex,
      topPercent: (minutesBetween(dayStart, clippedStart) / totalMinutes) * 100,
      heightPercent: (minutesBetween(clippedStart, clippedEnd) / totalMinutes) * 100
    });
  }

  return layouts;
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
