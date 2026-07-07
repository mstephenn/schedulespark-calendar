import { describe, expect, it } from "vitest";

import {
  expandRecurrenceEvents,
  getVisibleRange,
  indexEventsByUtcDay,
  layoutEvents,
  layoutResourceEvents
} from "../src";

import { buildLargeScheduleFixture } from "./fixtures/large-schedule";

const PERFORMANCE_BUDGET_MS = 100;

describe("calendar layout performance", () => {
  it("lays out a large resource day view within budget", () => {
    const { events, resources, weekStart } = buildLargeScheduleFixture();
    const startedAt = performance.now();

    const layouts = layoutResourceEvents({
      day: weekStart,
      events,
      resources,
      businessHours: { start: "00:00", end: "24:00" }
    });

    const elapsedMs = performance.now() - startedAt;

    expect(layouts.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
  });

  it("lays out a large week view within budget", () => {
    const { events } = buildLargeScheduleFixture({ resourceCount: 1, shiftsPerResource: 800 });
    const range = getVisibleRange({
      date: new Date("2026-07-08T12:00:00.000Z"),
      view: "week",
      weekStartsOn: 1
    });
    const startedAt = performance.now();

    const layouts = layoutEvents({
      events,
      range,
      businessHours: { start: "00:00", end: "24:00" }
    });

    const elapsedMs = performance.now() - startedAt;

    expect(layouts.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
  });

  it("indexes month events once instead of scanning per cell", () => {
    const { events } = buildLargeScheduleFixture({ resourceCount: 20, shiftsPerResource: 20 });
    const range = getVisibleRange({
      date: new Date("2026-07-08T12:00:00.000Z"),
      view: "month",
      weekStartsOn: 1
    });
    const startedAt = performance.now();

    const index = indexEventsByUtcDay(events, range.days);

    const elapsedMs = performance.now() - startedAt;

    expect(index.size).toBe(range.days.length);
    expect(elapsedMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
  });

  it("expands recurring masters for a visible range within budget", () => {
    const weekStart = new Date("2026-07-06T00:00:00.000Z");
    const masters = Array.from({ length: 50 }, (_, index) => ({
      id: `standup-${String(index + 1)}`,
      title: `Standup ${String(index + 1)}`,
      recurrenceRule: "FREQ=DAILY",
      start: new Date(weekStart.getTime() + index * 60_000),
      end: new Date(weekStart.getTime() + index * 60_000 + 30 * 60_000)
    }));
    const range = getVisibleRange({
      date: new Date("2026-07-08T12:00:00.000Z"),
      view: "week",
      weekStartsOn: 1
    });
    const startedAt = performance.now();

    const expanded = expandRecurrenceEvents({
      events: masters,
      rangeStart: range.start,
      rangeEnd: range.end
    });

    const elapsedMs = performance.now() - startedAt;

    expect(expanded.length).toBeGreaterThan(masters.length);
    expect(elapsedMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
  });
});
