import { describe, expect, it } from "vitest";

import { layoutResourceEvents } from "../src";

describe("calendar resource layout", () => {
  it("places same-day events into their assigned resource lanes", () => {
    const layouts = layoutResourceEvents({
      day: new Date("2026-07-06T12:00:00.000Z"),
      businessHours: { start: "08:00", end: "18:00" },
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ],
      events: [
        {
          id: "shift-1",
          title: "Grace morning",
          resourceId: "worker-2",
          start: new Date("2026-07-06T09:00:00.000Z"),
          end: new Date("2026-07-06T11:00:00.000Z")
        },
        {
          id: "shift-2",
          title: "Unknown worker",
          resourceId: "worker-3",
          start: new Date("2026-07-06T09:00:00.000Z"),
          end: new Date("2026-07-06T11:00:00.000Z")
        },
        {
          id: "shift-3",
          title: "Different day",
          resourceId: "worker-1",
          start: new Date("2026-07-07T09:00:00.000Z"),
          end: new Date("2026-07-07T11:00:00.000Z")
        }
      ]
    });

    expect(layouts).toHaveLength(1);
    expect(layouts[0]).toMatchObject({
      eventId: "shift-1",
      dayIndex: 0,
      resourceIndex: 1,
      topPercent: 10,
      heightPercent: 20
    });
  });

  it("places overnight events into resource lanes when they overlap the day", () => {
    const layouts = layoutResourceEvents({
      day: new Date("2026-07-06T12:00:00.000Z"),
      businessHours: { start: "08:00", end: "18:00" },
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ],
      events: [
        {
          id: "shift-overnight",
          title: "Ada overnight",
          resourceId: "worker-1",
          start: new Date("2026-07-05T22:00:00.000Z"),
          end: new Date("2026-07-06T09:30:00.000Z")
        }
      ]
    });

    expect(layouts).toHaveLength(1);
    expect(layouts[0]).toMatchObject({
      eventId: "shift-overnight",
      resourceIndex: 0,
      topPercent: 0,
      heightPercent: 15
    });
  });
});
