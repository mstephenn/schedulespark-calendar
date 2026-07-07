import { describe, expect, it } from "vitest";

import { generateTimeSlots, getVisibleRange, layoutEvents, formatDayNumber, getCurrentTimeIndicatorPercent, getSlotHeightPx, isSameUtcDay } from "../src";

describe("calendar time grid", () => {
  it("builds a Monday-start week range for the selected date", () => {
    const range = getVisibleRange({
      date: new Date("2026-07-08T12:00:00.000Z"),
      view: "week",
      weekStartsOn: 1
    });

    expect(range.start.toISOString()).toBe("2026-07-06T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-13T00:00:00.000Z");
    expect(range.days.map((day) => day.toISOString())).toEqual([
      "2026-07-06T00:00:00.000Z",
      "2026-07-07T00:00:00.000Z",
      "2026-07-08T00:00:00.000Z",
      "2026-07-09T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
      "2026-07-11T00:00:00.000Z",
      "2026-07-12T00:00:00.000Z"
    ]);
  });

  it("generates time slots inside configured business hours", () => {
    const slots = generateTimeSlots({
      day: new Date("2026-07-06T00:00:00.000Z"),
      businessHours: { start: "08:00", end: "10:00" },
      slotMinutes: 30
    });

    expect(slots.map((slot) => slot.start.toISOString())).toEqual([
      "2026-07-06T08:00:00.000Z",
      "2026-07-06T08:30:00.000Z",
      "2026-07-06T09:00:00.000Z",
      "2026-07-06T09:30:00.000Z"
    ]);
  });

  it("rejects non-positive slot durations", () => {
    expect(() =>
      generateTimeSlots({
        day: new Date("2026-07-06T00:00:00.000Z"),
        businessHours: { start: "08:00", end: "10:00" },
        slotMinutes: 0
      })
    ).toThrow("slotMinutes must be a positive number");

    expect(() =>
      generateTimeSlots({
        day: new Date("2026-07-06T00:00:00.000Z"),
        businessHours: { start: "08:00", end: "10:00" },
        slotMinutes: -30
      })
    ).toThrow("slotMinutes must be a positive number");
  });

  it("positions events within the visible week and clips events outside business hours", () => {
    const range = getVisibleRange({
      date: new Date("2026-07-06T12:00:00.000Z"),
      view: "week",
      weekStartsOn: 1
    });

    const layouts = layoutEvents({
      events: [
        {
          id: "shift-1",
          title: "Morning shift",
          start: new Date("2026-07-06T07:30:00.000Z"),
          end: new Date("2026-07-06T09:30:00.000Z")
        },
        {
          id: "shift-2",
          title: "Outside week",
          start: new Date("2026-07-20T09:00:00.000Z"),
          end: new Date("2026-07-20T10:00:00.000Z")
        }
      ],
      range,
      businessHours: { start: "08:00", end: "18:00" }
    });

    expect(layouts).toHaveLength(1);
    expect(layouts[0]).toMatchObject({
      eventId: "shift-1",
      dayIndex: 0,
      topPercent: 0,
      heightPercent: 15
    });
  });

  it("lays out events that overlap a visible day after starting on the previous day", () => {
    const range = getVisibleRange({
      date: new Date("2026-07-06T12:00:00.000Z"),
      view: "day"
    });

    const layouts = layoutEvents({
      events: [
        {
          id: "shift-overnight",
          title: "Overnight",
          start: new Date("2026-07-05T22:00:00.000Z"),
          end: new Date("2026-07-06T09:00:00.000Z")
        }
      ],
      range,
      businessHours: { start: "08:00", end: "18:00" }
    });

    expect(layouts).toHaveLength(1);
    expect(layouts[0]).toMatchObject({
      eventId: "shift-overnight",
      dayIndex: 0,
      topPercent: 0,
      heightPercent: 10
    });
  });

  it("creates one clipped layout per visible day for multi-day events", () => {
    const range = getVisibleRange({
      date: new Date("2026-07-06T12:00:00.000Z"),
      view: "week",
      weekStartsOn: 1
    });

    const layouts = layoutEvents({
      events: [
        {
          id: "shift-multi-day",
          title: "Multi-day",
          start: new Date("2026-07-06T16:00:00.000Z"),
          end: new Date("2026-07-08T10:00:00.000Z")
        }
      ],
      range,
      businessHours: { start: "08:00", end: "18:00" }
    });

    expect(layouts).toHaveLength(3);
    expect(layouts.map((layout) => layout.dayIndex)).toEqual([0, 1, 2]);
    expect(layouts.map((layout) => layout.heightPercent)).toEqual([20, 100, 20]);
  });
});

describe("calendar presentation helpers", () => {
  it("formats day numbers for column headers", () => {
    expect(formatDayNumber(new Date("2026-07-06T12:00:00.000Z"))).toBe("6");
  });

  it("detects matching UTC calendar days", () => {
    expect(isSameUtcDay(new Date("2026-07-06T08:00:00.000Z"), new Date("2026-07-06T20:00:00.000Z"))).toBe(true);
    expect(isSameUtcDay(new Date("2026-07-06T08:00:00.000Z"), new Date("2026-07-07T08:00:00.000Z"))).toBe(false);
  });

  it("positions the current-time indicator inside business hours", () => {
    const businessHours = { start: "08:00", end: "18:00" };
    const day = new Date("2026-07-06T00:00:00.000Z");
    const now = new Date("2026-07-06T13:00:00.000Z");

    expect(getCurrentTimeIndicatorPercent(day, businessHours, now)).toBe(50);
    expect(getCurrentTimeIndicatorPercent(new Date("2026-07-07T00:00:00.000Z"), businessHours, now)).toBeNull();
    expect(getCurrentTimeIndicatorPercent(day, businessHours, new Date("2026-07-06T07:00:00.000Z"))).toBeNull();
  });

  it("resolves slot heights for standard and compact density", () => {
    expect(getSlotHeightPx(false)).toBe(48);
    expect(getSlotHeightPx(true)).toBe(32);
  });
});
