import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCalendar } from "../src/calendar";

import type { CalendarDraftChange, CalendarEvent, CalendarInstance } from "../src/types";

const NOW = new Date("2026-07-08T12:00:00.000Z");

function buildEvent(): CalendarEvent {
  return {
    id: "shift-1",
    title: "Morning shift",
    start: new Date("2026-07-08T08:00:00.000Z"),
    end: new Date("2026-07-08T10:00:00.000Z")
  };
}

function dispatchPointer(target: EventTarget, type: string, init: PointerEventInit): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init }));
}

describe("createCalendar interactivity", () => {
  let host: HTMLElement;
  let instance: CalendarInstance | null;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    instance = null;
  });

  it("marks event blocks interactive and adds resize handles only when interactive is set", () => {
    instance = createCalendar({ date: NOW, events: [buildEvent()], view: "day", now: NOW });
    instance.mount(host);
    expect(host.querySelector(".sscal__event--interactive")).toBeNull();
    expect(host.querySelector(".sscal__event-resize")).toBeNull();

    instance.destroy();
    instance = createCalendar({ date: NOW, events: [buildEvent()], view: "day", now: NOW, interactive: true, onDraftChange: () => {} });
    instance.mount(host);
    expect(host.querySelector(".sscal__event--interactive")).not.toBeNull();
    expect(host.querySelectorAll(".sscal__event-resize")).toHaveLength(2);
  });

  it("calls onEventSelect on click regardless of interactive mode", () => {
    const onEventSelect = vi.fn();
    instance = createCalendar({ date: NOW, events: [buildEvent()], view: "day", now: NOW, onEventSelect });
    instance.mount(host);

    host.querySelector(".sscal__event")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onEventSelect).toHaveBeenCalledTimes(1);
    expect(onEventSelect.mock.calls[0][0].id).toBe("shift-1");
  });

  it("moves an event via ArrowDown and calls onDraftChange with the new bounds", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    block.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const draft: CalendarDraftChange = onDraftChange.mock.calls[0][0];
    expect(draft.kind).toBe("move");
    expect(draft.start.toISOString()).toBe("2026-07-08T09:00:00.000Z");
    expect(draft.end.toISOString()).toBe("2026-07-08T11:00:00.000Z");
  });

  it("resizes the start edge via Shift+ArrowUp", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    block.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowUp", shiftKey: true }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const draft: CalendarDraftChange = onDraftChange.mock.calls[0][0];
    expect(draft.kind).toBe("resize-start");
    expect(draft.start.toISOString()).toBe("2026-07-08T07:00:00.000Z");
    expect(draft.end.toISOString()).toBe("2026-07-08T10:00:00.000Z");
  });

  it("drags an event via pointer down/move/up and calls onDraftChange once, on pointerup", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    dispatchPointer(block, "pointerdown", { clientX: 0, clientY: 0 });
    expect(block.classList.contains("sscal__event--dragging")).toBe(true);
    expect(onDraftChange).not.toHaveBeenCalled();

    // jsdom columns report 0 width, so the pointer interaction falls back to a fixed
    // column width; moving vertically by one slot height's worth is enough to test snapping.
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 48 });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 48 });

    expect(block.classList.contains("sscal__event--dragging")).toBe(false);
    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange.mock.calls[0][0].kind).toBe("move");
  });

  it("cancels an in-progress drag on destroy without throwing", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    dispatchPointer(block, "pointerdown", { clientX: 0, clientY: 0 });

    expect(() => instance?.destroy()).not.toThrow();
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 100 });
    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it("moves a resource-lane event to the next resource via ArrowRight", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [{ ...buildEvent(), resourceId: "worker-1" }],
      view: "day",
      now: NOW,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ],
      interactive: true,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    block.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const draft: CalendarDraftChange = onDraftChange.mock.calls[0][0];
    expect(draft.kind).toBe("move");
    expect(draft.resourceId).toBe("worker-2");
    // A pure lane switch must not also shift the event in time.
    expect(draft.start.toISOString()).toBe(buildEvent().start.toISOString());
  });

  it("does not move a resource-lane event past the last resource", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [{ ...buildEvent(), resourceId: "worker-2" }],
      view: "day",
      now: NOW,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ],
      interactive: true,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    block.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange.mock.calls[0][0].resourceId).toBe("worker-2");
  });

  it("drags a resource-lane event to the next resource lane via pointer", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [{ ...buildEvent(), resourceId: "worker-1" }],
      view: "day",
      now: NOW,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ],
      interactive: true,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    dispatchPointer(block, "pointerdown", { clientX: 0, clientY: 0 });
    // jsdom reports 0-width columns, so the fixed 120px fallback column width is used —
    // one full column's worth of horizontal movement should move one resource lane over.
    dispatchPointer(window, "pointermove", { clientX: 120, clientY: 0 });
    dispatchPointer(window, "pointerup", { clientX: 120, clientY: 0 });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const draft: CalendarDraftChange = onDraftChange.mock.calls[0][0];
    expect(draft.kind).toBe("move");
    expect(draft.resourceId).toBe("worker-2");
  });

  it("does not change the resource lane when a resize handle is dragged horizontally", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [{ ...buildEvent(), resourceId: "worker-1" }],
      view: "day",
      now: NOW,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ],
      interactive: true,
      onDraftChange
    });
    instance.mount(host);

    const handle = host.querySelector(".sscal__event-resize--end") as HTMLElement;
    dispatchPointer(handle, "pointerdown", { clientX: 0, clientY: 0 });
    dispatchPointer(window, "pointermove", { clientX: 120, clientY: 0 });
    dispatchPointer(window, "pointerup", { clientX: 120, clientY: 0 });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const draft: CalendarDraftChange = onDraftChange.mock.calls[0][0];
    expect(draft.kind).toBe("resize-end");
    expect(draft.resourceId).toBe("worker-1");
  });

  it("resizes the end edge via pointer drag on the end handle", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange
    });
    instance.mount(host);

    const handle = host.querySelector(".sscal__event-resize--end") as HTMLElement;
    dispatchPointer(handle, "pointerdown", { clientX: 0, clientY: 0 });
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 48 });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 48 });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const draft: CalendarDraftChange = onDraftChange.mock.calls[0][0];
    expect(draft.kind).toBe("resize-end");
    expect(draft.start.toISOString()).toBe(buildEvent().start.toISOString());
  });

  it("rejects a keyboard move that would overlap another event when collisionPolicy is reject-overlap", () => {
    const onDraftChange = vi.fn();
    const events: CalendarEvent[] = [
      buildEvent(),
      { id: "shift-2", title: "Second shift", start: new Date("2026-07-08T10:00:00.000Z"), end: new Date("2026-07-08T12:00:00.000Z") }
    ];
    instance = createCalendar({
      date: NOW,
      events,
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 120,
      collisionPolicy: "reject-overlap",
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    block.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }));

    expect(onDraftChange).not.toHaveBeenCalled();
    expect(host.querySelector('[role="status"]')?.textContent).toMatch(/overlap|minimum duration/);
  });

  it("syncs horizontal scroll across header, all-day row, and body", () => {
    instance = createCalendar({
      date: NOW,
      events: [{ ...buildEvent(), allDay: true }],
      view: "week",
      now: NOW,
      weekStartsOn: 1
    });
    instance.mount(host);

    const scrollRegions = [...host.querySelectorAll<HTMLElement>(".sscal__columns-scroll")];
    expect(scrollRegions).toHaveLength(3);

    Object.defineProperty(scrollRegions[0], "scrollLeft", { value: 0, writable: true });
    scrollRegions[0].scrollLeft = 42;
    scrollRegions[0].dispatchEvent(new Event("scroll", { bubbles: false }));

    expect(scrollRegions[1].scrollLeft).toBe(42);
    expect(scrollRegions[2].scrollLeft).toBe(42);
  });

  it("preserves horizontal scroll position across a setEvents rebuild", () => {
    instance = createCalendar({ date: NOW, events: [buildEvent()], view: "week", now: NOW, weekStartsOn: 1 });
    instance.mount(host);

    const firstRegion = host.querySelector<HTMLElement>(".sscal__columns-scroll");
    expect(firstRegion).not.toBeNull();
    firstRegion!.scrollLeft = 77;

    instance.setEvents([{ ...buildEvent(), title: "Updated shift" }]);

    const regionsAfterRebuild = [...host.querySelectorAll<HTMLElement>(".sscal__columns-scroll")];
    expect(regionsAfterRebuild.every((region) => region.scrollLeft === 77)).toBe(true);
  });

  it("ctrl+drag on an existing event fires onEventCopy and leaves the original untouched", () => {
    const onDraftChange = vi.fn();
    const onEventCopy = vi.fn();
    const originalEvent = buildEvent();
    instance = createCalendar({
      date: NOW,
      events: [originalEvent],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange,
      onEventCopy
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    dispatchPointer(block, "pointerdown", { clientX: 0, clientY: 0, ctrlKey: true });
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 48, ctrlKey: true });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 48, ctrlKey: true });

    expect(onEventCopy).toHaveBeenCalledTimes(1);
    expect(onEventCopy.mock.calls[0][0].sourceEvent.id).toBe("shift-1");
    expect(onDraftChange).not.toHaveBeenCalled();
    // The original event's own start time is untouched — only a new, separate range was reported.
    expect(originalEvent.start.toISOString()).toBe(buildEvent().start.toISOString());
  });

  it("plain drag (no ctrl) still fires onDraftChange, not onEventCopy", () => {
    const onDraftChange = vi.fn();
    const onEventCopy = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange,
      onEventCopy
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    dispatchPointer(block, "pointerdown", { clientX: 0, clientY: 0 });
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 48 });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 48 });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onEventCopy).not.toHaveBeenCalled();
  });

  it("ctrl+drag with no onEventCopy set falls back to a normal move", () => {
    const onDraftChange = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange
    });
    instance.mount(host);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    dispatchPointer(block, "pointerdown", { clientX: 0, clientY: 0, ctrlKey: true });
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 48, ctrlKey: true });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 48, ctrlKey: true });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange.mock.calls[0][0].kind).toBe("move");
  });

  it("ctrl+drag on a resize handle still resizes and never fires onEventCopy", () => {
    const onDraftChange = vi.fn();
    const onEventCopy = vi.fn();
    instance = createCalendar({
      date: NOW,
      events: [buildEvent()],
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange,
      onEventCopy
    });
    instance.mount(host);

    const handle = host.querySelector(".sscal__event-resize--end") as HTMLElement;
    dispatchPointer(handle, "pointerdown", { clientX: 0, clientY: 0, ctrlKey: true });
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 48, ctrlKey: true });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 48, ctrlKey: true });

    expect(onEventCopy).not.toHaveBeenCalled();
    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange.mock.calls[0][0].kind).toBe("resize-end");
  });
});
