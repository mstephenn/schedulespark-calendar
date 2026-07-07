import { describe, expect, it } from "vitest";

import {
  buildInteractionDraft,
  hasCollision,
  snapMinutes
} from "../src";
import type { CalendarDraftChange, CollisionPolicy } from "../src";

describe("calendar interaction public types", () => {
  it("allows typed draft changes and collision policies", () => {
    const policy: CollisionPolicy = "reject-overlap";
    const change: CalendarDraftChange = {
      eventId: "shift-1",
      kind: "move",
      start: new Date("2026-07-06T09:00:00.000Z"),
      end: new Date("2026-07-06T11:00:00.000Z"),
      resourceId: "worker-1",
      hasCollisionWarning: false
    };

    expect(policy).toBe("reject-overlap");
    expect(change.kind).toBe("move");
  });
});

describe("calendar interaction math", () => {
  const baseEvent = {
    id: "shift-1",
    title: "Opening",
    start: new Date("2026-07-06T08:00:00.000Z"),
    end: new Date("2026-07-06T10:00:00.000Z"),
    resourceId: "worker-1"
  };

  it("moves an event by snapped minute and day deltas without mutating the source event", () => {
    const draft = buildInteractionDraft({
      event: baseEvent,
      kind: "move",
      minuteDelta: 44,
      dayDelta: 1,
      snapMinutes: 30,
      minimumDurationMinutes: 30,
      resourceId: "worker-2",
      events: [baseEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "resourceId"
    });

    expect(draft).toMatchObject({
      eventId: "shift-1",
      kind: "move",
      resourceId: "worker-2",
      hasCollisionWarning: false
    });
    expect(draft?.start.toISOString()).toBe("2026-07-07T08:30:00.000Z");
    expect(draft?.end.toISOString()).toBe("2026-07-07T10:30:00.000Z");
    expect(baseEvent.start.toISOString()).toBe("2026-07-06T08:00:00.000Z");
  });

  it("resizes start and end while enforcing minimum duration", () => {
    const resizedStart = buildInteractionDraft({
      event: baseEvent,
      kind: "resize-start",
      minuteDelta: 70,
      snapMinutes: 30,
      minimumDurationMinutes: 60,
      events: [baseEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "resourceId"
    });
    const resizedEnd = buildInteractionDraft({
      event: baseEvent,
      kind: "resize-end",
      minuteDelta: -90,
      snapMinutes: 30,
      minimumDurationMinutes: 60,
      events: [baseEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "resourceId"
    });

    expect(resizedStart?.start.toISOString()).toBe("2026-07-06T09:00:00.000Z");
    expect(resizedStart?.end.toISOString()).toBe("2026-07-06T10:00:00.000Z");
    expect(resizedEnd?.start.toISOString()).toBe("2026-07-06T08:00:00.000Z");
    expect(resizedEnd?.end.toISOString()).toBe("2026-07-06T09:00:00.000Z");
  });

  it("marks or rejects overlapping drafts based on collision policy", () => {
    const blockingEvent = {
      id: "shift-2",
      title: "Overlap",
      start: new Date("2026-07-06T10:00:00.000Z"),
      end: new Date("2026-07-06T12:00:00.000Z"),
      resourceId: "worker-1"
    };

    expect(
      hasCollision({
        draft: {
          eventId: "shift-1",
          kind: "move",
          start: new Date("2026-07-06T10:00:00.000Z"),
          end: new Date("2026-07-06T12:00:00.000Z"),
          resourceId: "worker-1",
          hasCollisionWarning: false
        },
        sourceEventId: "shift-1",
        events: [baseEvent, blockingEvent],
        collisionGroupBy: "resourceId"
      })
    ).toBe(true);

    const allowed = buildInteractionDraft({
      event: baseEvent,
      kind: "move",
      minuteDelta: 120,
      snapMinutes: 30,
      minimumDurationMinutes: 30,
      events: [baseEvent, blockingEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "resourceId"
    });
    const rejected = buildInteractionDraft({
      event: baseEvent,
      kind: "move",
      minuteDelta: 120,
      snapMinutes: 30,
      minimumDurationMinutes: 30,
      events: [baseEvent, blockingEvent],
      collisionPolicy: "reject-overlap",
      collisionGroupBy: "resourceId"
    });

    expect(allowed?.hasCollisionWarning).toBe(true);
    expect(rejected).toBeNull();
  });

  it("rejects resize that would shrink an event already shorter than the minimum duration", () => {
    const shortEvent = {
      id: "shift-1",
      title: "Short",
      start: new Date("2026-07-06T08:00:00.000Z"),
      end: new Date("2026-07-06T08:30:00.000Z"),
      resourceId: "worker-1"
    };

    expect(
      buildInteractionDraft({
        event: shortEvent,
        kind: "resize-start",
        minuteDelta: 30,
        snapMinutes: 30,
        minimumDurationMinutes: 60,
        events: [shortEvent],
        collisionPolicy: "allow",
        collisionGroupBy: "resourceId"
      })
    ).toBeNull();

    expect(
      buildInteractionDraft({
        event: shortEvent,
        kind: "resize-end",
        minuteDelta: -30,
        snapMinutes: 30,
        minimumDurationMinutes: 60,
        events: [shortEvent],
        collisionPolicy: "allow",
        collisionGroupBy: "resourceId"
      })
    ).toBeNull();
  });

  it("allows expanding an event that is shorter than the minimum duration", () => {
    const shortEvent = {
      id: "shift-1",
      title: "Short",
      start: new Date("2026-07-06T08:00:00.000Z"),
      end: new Date("2026-07-06T08:30:00.000Z"),
      resourceId: "worker-1"
    };

    const expanded = buildInteractionDraft({
      event: shortEvent,
      kind: "resize-end",
      minuteDelta: 60,
      snapMinutes: 30,
      minimumDurationMinutes: 60,
      events: [shortEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "resourceId"
    });

    expect(expanded?.start.toISOString()).toBe("2026-07-06T08:00:00.000Z");
    expect(expanded?.end.toISOString()).toBe("2026-07-06T09:30:00.000Z");
  });

  it("does not treat adjacent events as collisions", () => {
    const draft = buildInteractionDraft({
      event: {
        id: "shift-1",
        title: "Opening",
        start: new Date("2026-07-06T08:00:00.000Z"),
        end: new Date("2026-07-06T10:00:00.000Z"),
        resourceId: "worker-1"
      },
      kind: "move",
      minuteDelta: 120,
      snapMinutes: 30,
      minimumDurationMinutes: 30,
      events: [
        {
          id: "shift-1",
          title: "Opening",
          start: new Date("2026-07-06T08:00:00.000Z"),
          end: new Date("2026-07-06T10:00:00.000Z"),
          resourceId: "worker-1"
        },
        {
          id: "shift-2",
          title: "Lunch",
          start: new Date("2026-07-06T12:00:00.000Z"),
          end: new Date("2026-07-06T13:00:00.000Z"),
          resourceId: "worker-1"
        }
      ],
      collisionPolicy: "allow",
      collisionGroupBy: "day"
    });

    expect(draft?.start.toISOString()).toBe("2026-07-06T10:00:00.000Z");
    expect(draft?.end.toISOString()).toBe("2026-07-06T12:00:00.000Z");
    expect(draft?.hasCollisionWarning).toBe(false);
  });

  it("detects same-day overlaps in week view regardless of resourceId", () => {
    const eventA = {
      id: "shift-1",
      title: "Opening",
      start: new Date("2026-07-06T08:00:00.000Z"),
      end: new Date("2026-07-06T10:00:00.000Z"),
      resourceId: "worker-1"
    };
    const eventB = {
      id: "shift-2",
      title: "Overlap",
      start: new Date("2026-07-06T10:00:00.000Z"),
      end: new Date("2026-07-06T12:00:00.000Z"),
      resourceId: "worker-2"
    };

    expect(
      hasCollision({
        draft: {
          eventId: "shift-1",
          kind: "move",
          start: new Date("2026-07-06T10:00:00.000Z"),
          end: new Date("2026-07-06T12:00:00.000Z"),
          resourceId: "worker-1",
          hasCollisionWarning: false
        },
        sourceEventId: "shift-1",
        events: [eventA, eventB],
        collisionGroupBy: "day"
      })
    ).toBe(true);

    expect(
      hasCollision({
        draft: {
          eventId: "shift-1",
          kind: "move",
          start: new Date("2026-07-06T10:00:00.000Z"),
          end: new Date("2026-07-06T12:00:00.000Z"),
          resourceId: "worker-1",
          hasCollisionWarning: false
        },
        sourceEventId: "shift-1",
        events: [eventA, eventB],
        collisionGroupBy: "resourceId"
      })
    ).toBe(false);

    const rejected = buildInteractionDraft({
      event: eventA,
      kind: "move",
      minuteDelta: 120,
      snapMinutes: 30,
      minimumDurationMinutes: 30,
      events: [eventA, eventB],
      collisionPolicy: "reject-overlap",
      collisionGroupBy: "day"
    });

    expect(rejected).toBeNull();
  });

  it("does not detect collisions between events on different days in week view", () => {
    const mondayEvent = {
      id: "shift-mon",
      title: "Monday shift",
      start: new Date("2026-07-06T10:00:00.000Z"),
      end: new Date("2026-07-06T11:00:00.000Z"),
      resourceId: "worker-1"
    };
    const tuesdayEvent = {
      id: "shift-tue",
      title: "Tuesday shift",
      start: new Date("2026-07-07T10:00:00.000Z"),
      end: new Date("2026-07-07T11:00:00.000Z"),
      resourceId: "worker-1"
    };

    const draft = buildInteractionDraft({
      event: mondayEvent,
      kind: "move",
      minuteDelta: 0,
      snapMinutes: 30,
      minimumDurationMinutes: 30,
      events: [mondayEvent, tuesdayEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "day"
    });

    expect(draft?.hasCollisionWarning).toBe(false);
  });

  it("moves an event backward by snapped negative minute delta", () => {
    const draft = buildInteractionDraft({
      event: baseEvent,
      kind: "move",
      minuteDelta: -44,
      snapMinutes: 30,
      minimumDurationMinutes: 30,
      events: [baseEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "resourceId"
    });

    expect(draft?.start.toISOString()).toBe("2026-07-06T07:30:00.000Z");
    expect(draft?.end.toISOString()).toBe("2026-07-06T09:30:00.000Z");
  });

  it("allows expanding a short event via resize-start (moving start backward)", () => {
    const shortEvent = {
      id: "shift-1",
      title: "Short",
      start: new Date("2026-07-06T08:30:00.000Z"),
      end: new Date("2026-07-06T09:00:00.000Z"),
      resourceId: "worker-1"
    };

    const expanded = buildInteractionDraft({
      event: shortEvent,
      kind: "resize-start",
      minuteDelta: -60,
      snapMinutes: 30,
      minimumDurationMinutes: 60,
      events: [shortEvent],
      collisionPolicy: "allow",
      collisionGroupBy: "resourceId"
    });

    expect(expanded?.start.toISOString()).toBe("2026-07-06T07:30:00.000Z");
    expect(expanded?.end.toISOString()).toBe("2026-07-06T09:00:00.000Z");
  });
});

describe("snapMinutes", () => {
  it("snaps positive values to the nearest interval", () => {
    expect(snapMinutes(44, 30)).toBe(30);
    expect(snapMinutes(46, 30)).toBe(60);
    expect(snapMinutes(15, 30)).toBe(30);
    expect(snapMinutes(0, 30)).toBe(0);
  });

  it("snaps negative values to the nearest interval (asymmetric midpoint)", () => {
    expect(snapMinutes(-44, 30)).toBe(-30);
    expect(snapMinutes(-46, 30)).toBe(-60);
    // Math.round(-0.5) = -0 in IEEE 754; use === 0 to treat -0 and 0 as equal
    expect(snapMinutes(-15, 30) === 0).toBe(true);
  });

  it("throws for non-positive intervals", () => {
    expect(() => snapMinutes(30, 0)).toThrow("intervalMinutes must be a positive number");
    expect(() => snapMinutes(30, -5)).toThrow("intervalMinutes must be a positive number");
    expect(() => snapMinutes(30, NaN)).toThrow("intervalMinutes must be a positive number");
  });
});

describe("buildInteractionDraft validation", () => {
  const baseEvent = {
    id: "shift-1",
    title: "Opening",
    start: new Date("2026-07-06T08:00:00.000Z"),
    end: new Date("2026-07-06T10:00:00.000Z"),
    resourceId: "worker-1"
  };

  it("throws for non-positive snapMinutes", () => {
    expect(() =>
      buildInteractionDraft({
        event: baseEvent,
        kind: "move",
        minuteDelta: 0,
        snapMinutes: 0,
        minimumDurationMinutes: 30,
        events: [baseEvent],
        collisionPolicy: "allow",
        collisionGroupBy: "resourceId"
      })
    ).toThrow("snapMinutes must be a positive number");
  });

  it("throws for non-positive minimumDurationMinutes", () => {
    expect(() =>
      buildInteractionDraft({
        event: baseEvent,
        kind: "move",
        minuteDelta: 0,
        snapMinutes: 30,
        minimumDurationMinutes: -1,
        events: [baseEvent],
        collisionPolicy: "allow",
        collisionGroupBy: "resourceId"
      })
    ).toThrow("minimumDurationMinutes must be a positive number");
  });
});
