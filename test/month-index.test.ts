import { describe, expect, it } from "vitest";

import { getEventsForUtcDay, getVisibleRange, indexEventsByUtcDay } from "../src";

describe("indexEventsByUtcDay", () => {
  it("matches per-day lookups for month grid days", () => {
    const events = [
      {
        id: "a",
        title: "Morning",
        start: new Date("2026-07-06T08:00:00.000Z"),
        end: new Date("2026-07-06T10:00:00.000Z")
      },
      {
        id: "b",
        title: "Next day",
        start: new Date("2026-07-07T08:00:00.000Z"),
        end: new Date("2026-07-07T10:00:00.000Z")
      },
      {
        id: "c",
        title: "Spanning",
        start: new Date("2026-07-08T20:00:00.000Z"),
        end: new Date("2026-07-09T04:00:00.000Z")
      }
    ];
    const range = getVisibleRange({
      date: new Date("2026-07-08T12:00:00.000Z"),
      view: "month",
      weekStartsOn: 1
    });
    const index = indexEventsByUtcDay(events, range.days);

    for (const day of range.days) {
      const dayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
      expect(index.get(dayStart)?.map((event) => event.id)).toEqual(
        getEventsForUtcDay(events, day).map((event) => event.id)
      );
    }
  });
});
