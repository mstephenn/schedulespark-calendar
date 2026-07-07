import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCalendar } from "../src/calendar";

import type { CalendarDraftChange, CalendarEvent, CalendarInstance } from "../src/types";

const NOW = new Date("2026-07-08T12:00:00.000Z");

function buildEvents(): CalendarEvent[] {
  return [
    {
      id: "shift-1",
      title: "Morning shift",
      resourceId: "worker-1",
      start: new Date("2026-07-08T08:00:00.000Z"),
      end: new Date("2026-07-08T10:00:00.000Z")
    }
  ];
}

function dispatchPointer(target: EventTarget, type: string, init: PointerEventInit): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init }));
}

describe("createCalendar column show/hide", () => {
  let host: HTMLElement;
  let instance: CalendarInstance | null;

  beforeEach(() => {
    host = document.createElement("div");
    instance = null;
  });

  it("hides a resource column when its header is clicked", () => {
    instance = createCalendar({
      date: NOW,
      events: buildEvents(),
      view: "day",
      now: NOW,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ]
    });
    instance.mount(host);
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(2);

    const headers = [...host.querySelectorAll(".sscal__day-header")];
    headers[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(1);
    expect(host.querySelector(".sscal__day-header")?.textContent).toContain("Grace");
  });

  it("re-shows a hidden resource via the hidden-resources toggle strip", () => {
    instance = createCalendar({
      date: NOW,
      events: buildEvents(),
      view: "day",
      now: NOW,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ]
    });
    instance.mount(host);

    const headers = [...host.querySelectorAll(".sscal__day-header")];
    headers[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(1);

    const toggleChip = host.querySelector(".sscal__resource-toggle") as HTMLElement;
    expect(toggleChip.textContent).toContain("Ada");
    toggleChip.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(2);
    expect(host.querySelector(".sscal__resource-toggle")).toBeNull();
  });

  it("hides a resource with no events by default when hideEmptyResources is set", () => {
    instance = createCalendar({
      date: NOW,
      events: buildEvents(),
      view: "day",
      now: NOW,
      hideEmptyResources: true,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ]
    });
    instance.mount(host);

    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(1);
    expect(host.querySelector(".sscal__day-header")?.textContent).toContain("Ada");
    expect(host.querySelector(".sscal__resource-toggle")?.textContent).toContain("Grace");
  });

  it("a manual show on an empty resource sticks across a later setEvents rebuild", () => {
    instance = createCalendar({
      date: NOW,
      events: buildEvents(),
      view: "day",
      now: NOW,
      hideEmptyResources: true,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" }
      ]
    });
    instance.mount(host);

    const toggleChip = host.querySelector(".sscal__resource-toggle") as HTMLElement;
    toggleChip.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(2);

    instance.setEvents(buildEvents());

    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(2);
  });

  it("keeps a keyboard move on the correct resource after an earlier column is hidden", () => {
    const onDraftChange = vi.fn();
    const events: CalendarEvent[] = [
      {
        id: "shift-1",
        title: "Afternoon shift",
        resourceId: "worker-3",
        start: new Date("2026-07-08T08:00:00.000Z"),
        end: new Date("2026-07-08T10:00:00.000Z")
      }
    ];
    instance = createCalendar({
      date: NOW,
      events,
      view: "day",
      now: NOW,
      interactive: true,
      onDraftChange,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" },
        { id: "worker-3", title: "Lin" }
      ]
    });
    instance.mount(host);

    // Hide the first column (Ada) — the event's own column (Lin) is now index 1 in the
    // visible set, not index 2 as it is in the full resources list.
    host.querySelector(".sscal__day-header")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(2);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    block.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const draft: CalendarDraftChange = onDraftChange.mock.calls[0][0];
    // A pure vertical move must not reassign the event's resource lane at all.
    expect(draft.resourceId).toBe("worker-3");
  });

  it("keeps a pointer drag on the correct resource after an earlier column is hidden", () => {
    const onDraftChange = vi.fn();
    const events: CalendarEvent[] = [
      {
        id: "shift-1",
        title: "Afternoon shift",
        resourceId: "worker-3",
        start: new Date("2026-07-08T08:00:00.000Z"),
        end: new Date("2026-07-08T10:00:00.000Z")
      }
    ];
    instance = createCalendar({
      date: NOW,
      events,
      view: "day",
      now: NOW,
      interactive: true,
      slotMinutes: 60,
      onDraftChange,
      resources: [
        { id: "worker-1", title: "Ada" },
        { id: "worker-2", title: "Grace" },
        { id: "worker-3", title: "Lin" }
      ]
    });
    instance.mount(host);

    host.querySelector(".sscal__day-header")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(host.querySelectorAll(".sscal__day-header")).toHaveLength(2);

    const block = host.querySelector(".sscal__event") as HTMLElement;
    dispatchPointer(block, "pointerdown", { clientX: 0, clientY: 0 });
    // Vertical-only drag: no horizontal movement, so the resource lane must not change.
    dispatchPointer(window, "pointermove", { clientX: 0, clientY: 48 });
    dispatchPointer(window, "pointerup", { clientX: 0, clientY: 48 });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange.mock.calls[0][0].resourceId).toBe("worker-3");
  });
});
