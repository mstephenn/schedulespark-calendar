import { describe, expect, it } from "vitest";

import { FULL_DAY_HOURS, resolveDayBounds } from "../src/core/day-bounds";
import { generateTimeSlots, layoutEvents, getVisibleRange } from "../src";

describe("day bounds", () => {
  it("resolves a full UTC day through midnight", () => {
    const day = new Date("2026-07-06T12:00:00.000Z");
    const bounds = resolveDayBounds(day, FULL_DAY_HOURS);

    expect(bounds.start.toISOString()).toBe("2026-07-06T00:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-07T00:00:00.000Z");
  });

  it("generates slots across the full day by default", () => {
    const slots = generateTimeSlots({
      day: new Date("2026-07-06T00:00:00.000Z"),
      businessHours: FULL_DAY_HOURS,
      slotMinutes: 60
    });

    expect(slots).toHaveLength(24);
    expect(slots[0]?.start.toISOString()).toBe("2026-07-06T00:00:00.000Z");
    expect(slots.at(-1)?.start.toISOString()).toBe("2026-07-06T23:00:00.000Z");
  });

  it("lays out events that extend past the old 18:00 business-hours cutoff", () => {
    const range = getVisibleRange({
      date: new Date("2026-07-06T12:00:00.000Z"),
      view: "day"
    });

    const layouts = layoutEvents({
      events: [
        {
          id: "closing",
          title: "Closing shift",
          start: new Date("2026-07-06T14:00:00.000Z"),
          end: new Date("2026-07-06T22:00:00.000Z")
        }
      ],
      range,
      businessHours: FULL_DAY_HOURS
    });

    expect(layouts).toHaveLength(1);
    expect(layouts[0]?.heightPercent).toBeCloseTo((8 / 24) * 100, 5);
  });
});
