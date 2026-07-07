import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCalendar } from "../src/calendar";

import type { CalendarInstance } from "../src/types";

const NOW = new Date("2026-07-08T12:00:00.000Z");

function dispatchPointer(target: EventTarget, type: string, init: PointerEventInit): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init }));
}

describe("createCalendar drag-to-create", () => {
  let host: HTMLElement;
  let instance: CalendarInstance | null;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    instance = null;
  });

  it("creates a default-duration event on a plain click", () => {
    const onEventCreate = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      minimumDurationMinutes: 60,
      onEventCreate
    });
    instance.mount(host);

    const cell = host.querySelector(".sscal__day-column") as HTMLElement;
    dispatchPointer(cell, "pointerdown", { clientX: 0, clientY: 0 });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 0 });

    expect(onEventCreate).toHaveBeenCalledTimes(1);
    const input = onEventCreate.mock.calls[0][0];
    expect(input.end.getTime() - input.start.getTime()).toBe(60 * 60_000);
  });

  it("creates an event spanning the dragged range, snapped to snapMinutes", () => {
    const onEventCreate = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      snapMinutes: 60,
      minimumDurationMinutes: 60,
      onEventCreate
    });
    instance.mount(host);

    const cell = host.querySelector(".sscal__day-column") as HTMLElement;
    dispatchPointer(cell, "pointerdown", { clientX: 0, clientY: 0 });
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 96 });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 96 });

    expect(onEventCreate).toHaveBeenCalledTimes(1);
    const input = onEventCreate.mock.calls[0][0];
    expect(input.end.getTime() - input.start.getTime()).toBe(120 * 60_000);
  });

  it("sets resourceId when the drag starts inside a resource column", () => {
    const onEventCreate = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [],
      view: "day",
      now: NOW,
      resources: [{ id: "worker-1", title: "Ada" }],
      interactive: true,
      slotMinutes: 60,
      minimumDurationMinutes: 60,
      onEventCreate
    });
    instance.mount(host);

    const cell = host.querySelector(".sscal__day-column") as HTMLElement;
    dispatchPointer(cell, "pointerdown", { clientX: 0, clientY: 0 });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 0 });

    expect(onEventCreate.mock.calls[0][0].resourceId).toBe("worker-1");
  });

  it("does not attach create listeners when onEventCreate is unset", () => {
    instance = createCalendar({ date: NOW, events: [], view: "day", now: NOW, interactive: true });
    instance.mount(host);

    const cell = host.querySelector(".sscal__day-column") as HTMLElement;
    expect(() => {
      dispatchPointer(cell, "pointerdown", { clientX: 0, clientY: 0 });
      dispatchPointer(window, "pointerup", { clientX: 0, clientY: 0 });
    }).not.toThrow();
    // No ghost element should be left behind, and nothing should throw with no callback set.
    expect(host.querySelector(".sscal__event--ghost")).toBeNull();
  });

  it("cancels an in-progress create drag on destroy without throwing", () => {
    const onEventCreate = vi.fn();
    instance = createCalendar({ date: NOW, events: [], view: "day", now: NOW, interactive: true, onEventCreate });
    instance.mount(host);

    const cell = host.querySelector(".sscal__day-column") as HTMLElement;
    dispatchPointer(cell, "pointerdown", { clientX: 0, clientY: 0 });

    expect(() => instance?.destroy()).not.toThrow();
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 100 });
    expect(onEventCreate).not.toHaveBeenCalled();
  });
});
