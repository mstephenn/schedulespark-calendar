import { afterEach, describe, expect, it, vi } from "vitest";

import { expandRecurrenceEvents } from "../src";

const rangeStart = new Date("2026-07-06T00:00:00.000Z");
const rangeEnd = new Date("2026-07-13T00:00:00.000Z");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("expandRecurrenceEvents", () => {
  it("passes non-recurring events through unchanged", () => {
    const events = [
      {
        id: "shift-1",
        title: "One-off shift",
        start: new Date("2026-07-06T08:00:00.000Z"),
        end: new Date("2026-07-06T10:00:00.000Z")
      }
    ];

    expect(expandRecurrenceEvents({ events, rangeStart, rangeEnd })).toEqual(events);
  });

  it("expands weekly recurrence across the visible range", () => {
    const events = expandRecurrenceEvents({
      events: [
        {
          id: "series-1",
          title: "Weekly standup",
          start: new Date("2026-07-06T09:00:00.000Z"),
          end: new Date("2026-07-06T09:30:00.000Z"),
          recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
        }
      ],
      rangeStart,
      rangeEnd
    });

    expect(events.map((event) => event.start.toISOString())).toEqual([
      "2026-07-06T09:00:00.000Z",
      "2026-07-08T09:00:00.000Z",
      "2026-07-10T09:00:00.000Z"
    ]);
    expect(events.every((event) => event.recurrenceId === "series-1")).toBe(true);
    expect(events.every((event) => event.recurrenceRule === undefined)).toBe(true);
  });

  it("expands infinite weekly recurrence only inside the requested range", () => {
    const events = expandRecurrenceEvents({
      events: [
        {
          id: "series-2",
          title: "Daily opening",
          start: new Date("2026-07-01T08:00:00.000Z"),
          end: new Date("2026-07-01T10:00:00.000Z"),
          recurrenceRule: "FREQ=DAILY"
        }
      ],
      rangeStart,
      rangeEnd
    });

    expect(events).toHaveLength(7);
    expect(events[0]?.start.toISOString()).toBe("2026-07-06T08:00:00.000Z");
    expect(events.at(-1)?.start.toISOString()).toBe("2026-07-12T08:00:00.000Z");
  });

  it("expands recurring events in the requested local timezone", () => {
    const events = expandRecurrenceEvents({
      events: [
        {
          id: "series-ny",
          title: "Evening shift",
          start: new Date("2026-07-06T02:00:00.000Z"),
          end: new Date("2026-07-06T03:00:00.000Z"),
          recurrenceRule: "FREQ=WEEKLY;BYDAY=MO"
        }
      ],
      rangeStart: new Date("2026-07-06T00:00:00.000Z"),
      rangeEnd: new Date("2026-07-08T00:00:00.000Z"),
      timeZone: "America/New_York"
    });

    expect(events.map((event) => event.start.toISOString())).toEqual(["2026-07-07T02:00:00.000Z"]);
    expect(events.map((event) => event.end.toISOString())).toEqual(["2026-07-07T03:00:00.000Z"]);
  });

  it("preserves local wall-clock duration across DST", () => {
    const events = expandRecurrenceEvents({
      events: [
        {
          id: "series-dst",
          title: "Opening shift",
          start: new Date("2026-03-07T14:00:00.000Z"),
          end: new Date("2026-03-07T15:00:00.000Z"),
          recurrenceRule: "FREQ=DAILY"
        }
      ],
      rangeStart: new Date("2026-03-07T00:00:00.000Z"),
      rangeEnd: new Date("2026-03-10T00:00:00.000Z"),
      timeZone: "America/New_York"
    });

    expect(events.map((event) => event.start.toISOString())).toEqual([
      "2026-03-07T14:00:00.000Z",
      "2026-03-08T13:00:00.000Z",
      "2026-03-09T13:00:00.000Z"
    ]);
    expect(events.map((event) => event.end.toISOString())).toEqual([
      "2026-03-07T15:00:00.000Z",
      "2026-03-08T14:00:00.000Z",
      "2026-03-09T14:00:00.000Z"
    ]);
  });

  it("respects COUNT and UNTIL limits", () => {
    const counted = expandRecurrenceEvents({
      events: [
        {
          id: "series-3",
          title: "Short series",
          start: new Date("2026-07-06T08:00:00.000Z"),
          end: new Date("2026-07-06T09:00:00.000Z"),
          recurrenceRule: "FREQ=DAILY;COUNT=2"
        }
      ],
      rangeStart,
      rangeEnd
    });

    expect(counted).toHaveLength(2);

    const until = expandRecurrenceEvents({
      events: [
        {
          id: "series-4",
          title: "Until series",
          start: new Date("2026-07-06T08:00:00.000Z"),
          end: new Date("2026-07-06T09:00:00.000Z"),
          recurrenceRule: "FREQ=DAILY;UNTIL=20260708T000000Z"
        }
      ],
      rangeStart,
      rangeEnd
    });

    expect(until.map((event) => event.start.toISOString())).toEqual([
      "2026-07-06T08:00:00.000Z",
      "2026-07-07T08:00:00.000Z"
    ]);
  });

  it("excludes occurrences that start exactly at rangeEnd", () => {
    const events = expandRecurrenceEvents({
      events: [
        {
          id: "series-midnight",
          title: "Monday midnight",
          start: new Date("2026-07-06T00:00:00.000Z"),
          end: new Date("2026-07-06T01:00:00.000Z"),
          recurrenceRule: "FREQ=WEEKLY;BYDAY=MO"
        }
      ],
      rangeStart,
      rangeEnd
    });

    expect(events.map((event) => event.start.toISOString())).toEqual(["2026-07-06T00:00:00.000Z"]);
  });

  it("copies event display fields to occurrences", () => {
    const events = expandRecurrenceEvents({
      events: [
        {
          id: "series-5",
          title: "Assigned shift",
          resourceId: "worker-1",
          color: "#6366F1",
          allDay: true,
          start: new Date("2026-07-06T08:00:00.000Z"),
          end: new Date("2026-07-06T10:00:00.000Z"),
          recurrenceRule: "FREQ=WEEKLY;BYDAY=MO"
        }
      ],
      rangeStart,
      rangeEnd
    });

    expect(events[0]).toMatchObject({
      title: "Assigned shift",
      resourceId: "worker-1",
      color: "#6366F1",
      allDay: true
    });
  });

  it("skips invalid recurrence rules without dropping valid events", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const events = expandRecurrenceEvents({
      events: [
        {
          id: "bad-series",
          title: "Broken",
          start: new Date("2026-07-06T08:00:00.000Z"),
          end: new Date("2026-07-06T10:00:00.000Z"),
          recurrenceRule: "FREQ=NOTREAL"
        },
        {
          id: "shift-1",
          title: "One-off shift",
          start: new Date("2026-07-06T12:00:00.000Z"),
          end: new Date("2026-07-06T13:00:00.000Z")
        }
      ],
      rangeStart,
      rangeEnd
    });

    expect(events.map((event) => event.id)).toEqual(["shift-1"]);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skipping recurring event "bad-series"'));
  });

  it("skips recurring events that exceed the occurrence cap without dropping valid events", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const events = expandRecurrenceEvents({
      events: [
        {
          id: "too-large-series",
          title: "Too frequent",
          start: new Date("2000-01-01T00:00:00.000Z"),
          end: new Date("2000-01-01T00:30:00.000Z"),
          recurrenceRule: "FREQ=SECONDLY"
        },
        {
          id: "shift-1",
          title: "One-off shift",
          start: new Date("2026-07-06T12:00:00.000Z"),
          end: new Date("2026-07-06T13:00:00.000Z")
        }
      ],
      rangeStart: new Date("2000-01-01T00:00:00.000Z"),
      rangeEnd: new Date("2030-01-01T00:00:00.000Z")
    });

    expect(events.map((event) => event.id)).toEqual(["shift-1"]);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skipping recurring event "too-large-series"'));
  });
});
