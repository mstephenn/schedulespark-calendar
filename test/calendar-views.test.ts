import { describe, expect, it } from "vitest";

import {
  getEventsForUtcDay,
  getMonthGridDays,
  getVisibleRange,
  isSameUtcMonth,
  startOfWorkWeek
} from "../src";

describe("calendar views", () => {
  it("builds a Monday-start work week with five days", () => {
    const range = getVisibleRange({
      date: new Date("2026-07-08T12:00:00.000Z"),
      view: "workweek",
      weekStartsOn: 1
    });

    expect(range.days).toHaveLength(5);
    expect(range.days.map((day) => day.toISOString())).toEqual([
      "2026-07-06T00:00:00.000Z",
      "2026-07-07T00:00:00.000Z",
      "2026-07-08T00:00:00.000Z",
      "2026-07-09T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z"
    ]);
  });

  it("advances weekend dates to the next work week", () => {
    expect(startOfWorkWeek(new Date("2026-07-11T12:00:00.000Z")).toISOString()).toBe("2026-07-13T00:00:00.000Z");
    expect(startOfWorkWeek(new Date("2026-07-12T12:00:00.000Z")).toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });

  it("builds a six-week month grid for the anchor month", () => {
    const days = getMonthGridDays(new Date("2026-07-15T12:00:00.000Z"), 1);

    expect(days).toHaveLength(42);
    expect(days[0]?.toISOString()).toBe("2026-06-29T00:00:00.000Z");
    expect(days.at(-1)?.toISOString()).toBe("2026-08-09T00:00:00.000Z");
    expect(isSameUtcMonth(new Date("2026-07-01T00:00:00.000Z"), new Date("2026-07-15T12:00:00.000Z"))).toBe(true);
    expect(isSameUtcMonth(new Date("2026-06-29T00:00:00.000Z"), new Date("2026-07-15T12:00:00.000Z"))).toBe(false);
  });

  it("groups events by UTC day for month cells", () => {
    const events = getEventsForUtcDay(
      [
        {
          id: "late",
          title: "Late shift",
          start: new Date("2026-07-06T20:00:00.000Z"),
          end: new Date("2026-07-06T22:00:00.000Z")
        },
        {
          id: "next-day",
          title: "Next day",
          start: new Date("2026-07-07T09:00:00.000Z"),
          end: new Date("2026-07-07T10:00:00.000Z")
        }
      ],
      new Date("2026-07-06T00:00:00.000Z")
    );

    expect(events.map((event) => event.id)).toEqual(["late"]);
  });
});
