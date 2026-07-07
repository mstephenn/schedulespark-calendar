import { describe, expect, it } from "vitest";

import {
  getAllDayEventStyle,
  getMonthEventStyle,
  getTimedEventStyle,
  resolveEventColor
} from "../src/core/event-colors";

import type { CalendarEvent } from "../src/types";

const baseEvent: CalendarEvent = {
  id: "shift-1",
  title: "Morning shift",
  start: new Date("2026-07-06T08:00:00.000Z"),
  end: new Date("2026-07-06T10:00:00.000Z")
};

describe("resolveEventColor", () => {
  it("returns the event color when provided by the consumer", () => {
    expect(resolveEventColor({ ...baseEvent, color: "#107c10" })).toBe("#107c10");
  });

  it("returns an explicit default color when the event omits color", () => {
    expect(resolveEventColor(baseEvent, "#6264a7")).toBe("#6264a7");
  });

  it("returns undefined when no color is configured", () => {
    expect(resolveEventColor(baseEvent)).toBeUndefined();
  });
});

describe("event color styles", () => {
  it("omits timed event background styles without a configured color", () => {
    expect(getTimedEventStyle(undefined)).toEqual({});
  });

  it("omits all-day and month styles without a configured color", () => {
    expect(getAllDayEventStyle(undefined)).toBeUndefined();
    expect(getMonthEventStyle(undefined)).toBeUndefined();
  });

  it("applies explicit colors to timed, all-day, and month styles", () => {
    expect(getTimedEventStyle("#0078d4")).toEqual({ backgroundColor: "#0078d4" });
    expect(getAllDayEventStyle("#0078d4")).toEqual({ backgroundColor: "#0078d4" });
    expect(getMonthEventStyle("#0078d4")).toEqual({
      backgroundColor: "#0078d422",
      borderLeftColor: "#0078d4"
    });
  });

  it("uses color-mix for non-hex color values like CSS custom properties", () => {
    expect(getMonthEventStyle("var(--color-brand)")).toEqual({
      backgroundColor: "color-mix(in srgb, var(--color-brand) 13%, transparent)",
      borderLeftColor: "var(--color-brand)"
    });
  });

  it("uses color-mix for CSS color formats that aren't hex literals", () => {
    expect(getMonthEventStyle("rgb(79, 70, 229)")).toEqual({
      backgroundColor: "color-mix(in srgb, rgb(79, 70, 229) 13%, transparent)",
      borderLeftColor: "rgb(79, 70, 229)"
    });
    expect(getMonthEventStyle("rebeccapurple")).toEqual({
      backgroundColor: "color-mix(in srgb, rebeccapurple 13%, transparent)",
      borderLeftColor: "rebeccapurple"
    });
  });
});
