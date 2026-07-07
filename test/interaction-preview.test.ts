import { describe, expect, it } from "vitest";

import { FULL_DAY_HOURS, buildInteractionPreview } from "../src";

describe("buildInteractionPreview", () => {
  const baseEvent = {
    id: "shift-1",
    title: "Opening",
    start: new Date("2026-07-06T08:00:00.000Z"),
    end: new Date("2026-07-06T10:00:00.000Z"),
    resourceId: "worker-1"
  };
  const visibleDays = [
    new Date("2026-07-06T00:00:00.000Z"),
    new Date("2026-07-07T00:00:00.000Z"),
    new Date("2026-07-08T00:00:00.000Z")
  ];
  const resources = [
    { id: "worker-1", title: "Ada" },
    { id: "worker-2", title: "Grace" }
  ];

  it("returns snapped move preview coordinates for another day", () => {
    const preview = buildInteractionPreview({
      businessHours: FULL_DAY_HOURS,
      collisionGroupBy: "day",
      collisionPolicy: "allow",
      dayDelta: 1,
      event: baseEvent,
      events: [baseEvent],
      kind: "move",
      minimumDurationMinutes: 60,
      minuteDelta: 60,
      resources,
      snapMinutes: 60,
      usesResourceLanes: false,
      visibleDays
    });

    expect(preview).toMatchObject({
      dayIndex: 1,
      hasCollisionWarning: false,
      topPercent: (9 / 24) * 100,
      heightPercent: (2 / 24) * 100
    });
  });

  it("returns live resize preview coordinates", () => {
    const preview = buildInteractionPreview({
      businessHours: FULL_DAY_HOURS,
      collisionGroupBy: "day",
      collisionPolicy: "allow",
      event: baseEvent,
      events: [baseEvent],
      kind: "resize-end",
      minimumDurationMinutes: 60,
      minuteDelta: 120,
      resources,
      snapMinutes: 60,
      usesResourceLanes: false,
      visibleDays
    });

    expect(preview).toMatchObject({
      dayIndex: 0,
      topPercent: (8 / 24) * 100,
      heightPercent: (4 / 24) * 100
    });
  });

  it("returns resource lane preview coordinates when moving across lanes", () => {
    const preview = buildInteractionPreview({
      businessHours: FULL_DAY_HOURS,
      collisionGroupBy: "resourceId",
      collisionPolicy: "allow",
      event: baseEvent,
      events: [baseEvent],
      kind: "move",
      minimumDurationMinutes: 60,
      minuteDelta: 0,
      resourceId: "worker-2",
      resources,
      snapMinutes: 60,
      usesResourceLanes: true,
      visibleDays: [visibleDays[0]!]
    });

    expect(preview).toMatchObject({
      dayIndex: 0,
      resourceIndex: 1,
      topPercent: (8 / 24) * 100,
      heightPercent: (2 / 24) * 100
    });
  });

  it("returns null when reject-overlap blocks the preview position", () => {
    const preview = buildInteractionPreview({
      businessHours: FULL_DAY_HOURS,
      collisionGroupBy: "day",
      collisionPolicy: "reject-overlap",
      event: baseEvent,
      events: [
        baseEvent,
        {
          id: "shift-2",
          title: "Blocked",
          start: new Date("2026-07-06T09:00:00.000Z"),
          end: new Date("2026-07-06T11:00:00.000Z")
        }
      ],
      kind: "move",
      minimumDurationMinutes: 60,
      minuteDelta: 60,
      resources,
      snapMinutes: 60,
      usesResourceLanes: false,
      visibleDays
    });

    expect(preview).toBeNull();
  });
});
