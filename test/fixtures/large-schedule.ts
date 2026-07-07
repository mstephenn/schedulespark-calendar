import type { CalendarEvent, CalendarResource } from "../../src/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Builds a realistic large worker schedule for performance tests.
 */
export function buildLargeScheduleFixture(input: {
  resourceCount?: number;
  shiftsPerResource?: number;
  weekStart?: Date;
} = {}): { events: CalendarEvent[]; resources: CalendarResource[]; weekStart: Date } {
  const resourceCount = input.resourceCount ?? 100;
  const shiftsPerResource = input.shiftsPerResource ?? 8;
  const weekStart = input.weekStart ?? new Date("2026-07-06T00:00:00.000Z");

  const resources = Array.from({ length: resourceCount }, (_, index) => ({
    id: `worker-${String(index + 1)}`,
    title: `Worker ${String(index + 1)}`
  }));

  const events: CalendarEvent[] = [];

  for (let resourceIndex = 0; resourceIndex < resourceCount; resourceIndex += 1) {
    const resource = resources[resourceIndex];
    if (!resource) continue;

    for (let shiftIndex = 0; shiftIndex < shiftsPerResource; shiftIndex += 1) {
      const dayOffset = shiftIndex % 5;
      const start = new Date(weekStart.getTime() + dayOffset * DAY_MS + 8 * HOUR_MS + shiftIndex * 15 * 60 * 1000);
      const end = new Date(start.getTime() + 4 * HOUR_MS);

      events.push({
        id: `${resource.id}-shift-${String(shiftIndex + 1)}`,
        title: `Shift ${String(shiftIndex + 1)}`,
        resourceId: resource.id,
        start,
        end
      });
    }
  }

  return { events, resources, weekStart };
}
