import { beforeEach, describe, expect, it } from "vitest";

import { createCalendar } from "../src/calendar";

import type { CalendarEvent, CalendarInstance } from "../src/types";

const NOW = new Date("2026-07-08T12:00:00.000Z");

function buildEvents(): CalendarEvent[] {
  return [
    {
      id: "morning-shift",
      title: "Morning shift",
      color: "#107c10",
      start: new Date("2026-07-08T08:00:00.000Z"),
      end: new Date("2026-07-08T12:00:00.000Z")
    },
    {
      id: "site-closed",
      title: "Site closed",
      allDay: true,
      color: "#e81123",
      start: new Date("2026-07-08T00:00:00.000Z"),
      end: new Date("2026-07-09T00:00:00.000Z")
    }
  ];
}

describe("createCalendar", () => {
  let host: HTMLElement;
  let instance: CalendarInstance | null;

  beforeEach(() => {
    host = document.createElement("div");
    instance = null;
  });

  it("renders a day view with column header, event block, and all-day chip", () => {
    instance = createCalendar({ date: NOW, events: buildEvents(), view: "day", now: NOW });
    instance.mount(host);

    expect(host.querySelector(".sscal--day")).not.toBeNull();
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(1);
    expect(host.querySelector(".sscal__event")?.textContent).toContain("Morning shift");
    expect(host.querySelector(".sscal__all-day-event")?.textContent).toBe("Site closed");
  });

  it("renders a week view with seven day columns", () => {
    instance = createCalendar({ date: NOW, events: buildEvents(), view: "week", now: NOW, weekStartsOn: 1 });
    instance.mount(host);

    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(7);
  });

  it("renders a month view with a 6-week grid and the today highlight", () => {
    instance = createCalendar({ date: NOW, events: buildEvents(), view: "month", now: NOW, weekStartsOn: 1 });
    instance.mount(host);

    expect(host.querySelectorAll(".sscal__month-day")).toHaveLength(42);
    expect(host.querySelector(".sscal__month-day--today")).not.toBeNull();
    const eventTitles = [...host.querySelectorAll(".sscal__month-event-title")].map((el) => el.textContent);
    expect(eventTitles).toContain("Morning shift");
  });

  it("caps visible month events and shows a +N more indicator", () => {
    const events: CalendarEvent[] = Array.from({ length: 6 }, (_, index) => ({
      id: `event-${String(index)}`,
      title: `Event ${String(index)}`,
      start: new Date("2026-07-08T09:00:00.000Z"),
      end: new Date("2026-07-08T10:00:00.000Z")
    }));
    instance = createCalendar({ date: NOW, events, view: "month", now: NOW });
    instance.mount(host);

    const dayCell = [...host.querySelectorAll(".sscal__month-day")].find((cell) =>
      cell.textContent?.includes("Event 0")
    );
    expect(dayCell?.querySelectorAll(".sscal__month-event")).toHaveLength(4);
    expect(dayCell?.querySelector(".sscal__month-more")?.textContent).toBe("+2 more");
  });

  it("rebuilds the mounted DOM when setView/setDate/setEvents are called", () => {
    instance = createCalendar({ date: NOW, events: buildEvents(), view: "day", now: NOW });
    instance.mount(host);
    expect(host.querySelector(".sscal--day")).not.toBeNull();

    instance.setView("month");
    expect(host.querySelector(".sscal--month")).not.toBeNull();
    expect(host.querySelector(".sscal--day")).toBeNull();

    instance.setEvents([]);
    expect(host.querySelector(".sscal__month-event")).toBeNull();
  });

  it("applies arbitrary option changes via setOptions", () => {
    instance = createCalendar({ date: NOW, events: [], view: "day", now: NOW, resources: [] });
    instance.mount(host);
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(1);

    instance.setOptions({
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ]
    });
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(2);
  });

  it("rejects an invalid setOptions call without corrupting subsequent renders", () => {
    instance = createCalendar({ date: NOW, events: buildEvents(), view: "day", now: NOW });
    instance.mount(host);

    expect(() => {
      instance?.setOptions({ interactive: true, snapMinutes: -5 });
    }).toThrow(/snapMinutes must be a positive number/);

    // The rejected call must not have wedged the instance against the bad options —
    // a later, valid call should still render normally.
    expect(() => {
      instance?.setView("month");
    }).not.toThrow();
    expect(host.querySelector(".sscal--month")).not.toBeNull();
  });

  it("rejects setOptions calls that would clear a required field", () => {
    instance = createCalendar({ date: NOW, events: buildEvents(), view: "day", now: NOW });
    instance.mount(host);

    expect(() => {
      instance?.setOptions({ date: undefined });
    }).toThrow(/date must be a Date/);
    expect(() => {
      instance?.setOptions({ events: undefined });
    }).toThrow(/events must be an array/);

    // Still renders correctly afterward — the bad calls didn't corrupt state.
    expect(host.querySelector(".sscal__event")?.textContent).toContain("Morning shift");
  });

  it("clears the host on destroy", () => {
    instance = createCalendar({ date: NOW, events: buildEvents(), view: "day", now: NOW });
    instance.mount(host);
    expect(host.children.length).toBeGreaterThan(0);

    instance.destroy();
    expect(host.children.length).toBe(0);
  });
});
