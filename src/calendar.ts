/* eslint-disable jsdoc/require-jsdoc -- Private option-resolution helpers stay documented at the exported-function level only. */
import { createColumnVisibility } from "./column-visibility";
import { FULL_DAY_HOURS } from "./core/day-bounds";
import { expandRecurrenceEvents } from "./core/recurrence";
import { getSlotHeightPx, getVisibleRange } from "./core/time-grid";
import { renderMonthView, renderTimeGridCalendar } from "./render";
import { readScrollLeft, writeScrollLeft } from "./scroll-position";

import type { ColumnVisibilityController } from "./column-visibility";
import type {
  BusinessHours,
  CalendarDraftChange,
  CalendarEvent,
  CalendarInstance,
  CalendarOptions,
  CalendarResource,
  CalendarView,
  CollisionPolicy
} from "./types";

const DEFAULT_BUSINESS_HOURS = FULL_DAY_HOURS;
const DEFAULT_SLOT_MINUTES = 60;
const DEFAULT_WEEK_START = 1;

/**
 * Calendar options with defaults applied.
 */
export interface ResolvedCalendarOptions {
  businessHours: BusinessHours;
  collisionPolicy: CollisionPolicy;
  compact: boolean;
  defaultEventColor?: string;
  hideEmptyResources: boolean;
  interactive: boolean;
  minimumDurationMinutes: number;
  now: Date;
  onDraftChange?: (change: CalendarDraftChange) => void;
  onEventCopy?: (input: { sourceEvent: CalendarEvent; start: Date; end: Date; resourceId?: string }) => void;
  onEventCreate?: (input: { start: Date; end: Date; resourceId?: string }) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  resources: CalendarResource[];
  showCurrentTimeIndicator: boolean;
  slotHeightPx: number;
  slotMinutes: number;
  snapMinutes: number;
  weekStartsOn: number;
}

/**
 * Tracks the currently in-progress pointer interaction (if any), so a rebuild or
 * `destroy()` can cancel it instead of leaving stale window-level listeners behind.
 */
export interface InteractionRegistry {
  setActive: (cleanup: (() => void) | null) => void;
  clearActive: () => void;
}

function createInteractionRegistry(): InteractionRegistry {
  let activeCleanup: (() => void) | null = null;
  return {
    setActive(cleanup: (() => void) | null): void {
      if (cleanup !== activeCleanup) activeCleanup?.();
      activeCleanup = cleanup;
    },
    clearActive(): void {
      activeCleanup?.();
      activeCleanup = null;
    }
  };
}

/**
 * Creates a framework-free schedule calendar. Rebuilds the mounted subtree on every
 * option change, matching `@schedulespark/date-picker`/`@schedulespark/time-picker`'s
 * rendering convention rather than diffing the DOM incrementally.
 */
export function createCalendar(initialOptions: CalendarOptions): CalendarInstance {
  let host: HTMLElement | null = null;
  let currentOptions: CalendarOptions = initialOptions;
  const interactionRegistry = createInteractionRegistry();
  const columnVisibility = createColumnVisibility(() => {
    applyOptions(currentOptions);
  });

  /**
   * Validates and renders `nextOptions`, only committing them to `currentOptions` if
   * validation and rendering both succeed — so a rejected update (e.g. invalid
   * `snapMinutes`) leaves the instance in its last-known-good state instead of
   * permanently wedging it against options that will keep failing on every future call.
   */
  function applyOptions(nextOptions: CalendarOptions): void {
    assertRequiredOptions(nextOptions);
    if (host) {
      const preservedScrollLeft = readScrollLeft(host);
      const root = buildRoot(nextOptions, interactionRegistry, columnVisibility);
      interactionRegistry.clearActive();
      host.replaceChildren(root);
      if (preservedScrollLeft !== null) writeScrollLeft(host, preservedScrollLeft);
    }
    currentOptions = nextOptions;
  }

  return {
    mount(newHost: HTMLElement): void {
      host = newHost;
      applyOptions(currentOptions);
    },
    destroy(): void {
      interactionRegistry.clearActive();
      host?.replaceChildren();
      host = null;
    },
    setDate(date: Date): void {
      applyOptions({ ...currentOptions, date });
    },
    setEvents(events: CalendarEvent[]): void {
      applyOptions({ ...currentOptions, events });
    },
    setOptions(partial: Partial<CalendarOptions>): void {
      applyOptions({ ...currentOptions, ...partial });
    },
    setView(view: CalendarView): void {
      applyOptions({ ...currentOptions, view });
    }
  };
}

/**
 * Guards against `setOptions` clearing a required field by passing it as `undefined`
 * explicitly (allowed by `Partial<CalendarOptions>`'s type but invalid at runtime).
 */
function assertRequiredOptions(options: CalendarOptions): void {
  if (!(options.date instanceof Date)) {
    throw new Error("createCalendar: date must be a Date");
  }
  if (!Array.isArray(options.events)) {
    throw new Error("createCalendar: events must be an array");
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `view` is required per its static type, but a `setOptions({ view: undefined })` merge can violate that at runtime.
  if (options.view === undefined) {
    throw new Error("createCalendar: view must be set");
  }
}

function buildRoot(
  options: CalendarOptions,
  interactionRegistry: InteractionRegistry,
  columnVisibility: ColumnVisibilityController
): HTMLElement {
  const now = options.now ?? new Date();
  const resolved = resolveCalendarOptions(options, now);
  const range = getVisibleRange({ date: options.date, view: options.view, weekStartsOn: resolved.weekStartsOn });
  const expandedEvents = expandRecurrenceEvents({
    events: options.events,
    rangeStart: range.start,
    rangeEnd: range.end,
    timeZone: options.timeZone
  });

  if (options.view === "month") {
    const section = document.createElement("section");
    section.setAttribute("aria-label", "Schedule calendar");
    section.className = "sscal sscal--month";
    section.setAttribute("role", "grid");
    section.appendChild(
      renderMonthView({
        anchorDate: options.date,
        days: range.days,
        defaultEventColor: resolved.defaultEventColor,
        events: expandedEvents,
        now: resolved.now,
        weekStartsOn: resolved.weekStartsOn
      })
    );
    return section;
  }

  return renderTimeGridCalendar({
    columnVisibility,
    events: expandedEvents,
    interactionRegistry,
    options: resolved,
    view: options.view,
    range
  });
}

function resolveSlotOptions(options: CalendarOptions): { minimumDurationMinutes: number; slotMinutes: number; snapMinutes: number } {
  const slotMinutes = options.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const snapMinutes = options.snapMinutes ?? slotMinutes;
  const minimumDurationMinutes = options.minimumDurationMinutes ?? snapMinutes;
  assertInteractiveOptions(options.interactive, snapMinutes, minimumDurationMinutes);
  return { minimumDurationMinutes, slotMinutes, snapMinutes };
}

function resolveDisplayDefaults(
  options: CalendarOptions,
  now: Date
): Pick<
  ResolvedCalendarOptions,
  | "businessHours"
  | "collisionPolicy"
  | "defaultEventColor"
  | "hideEmptyResources"
  | "interactive"
  | "now"
  | "onDraftChange"
  | "onEventCopy"
  | "onEventCreate"
  | "onEventSelect"
  | "resources"
  | "showCurrentTimeIndicator"
  | "weekStartsOn"
> {
  return {
    businessHours: options.businessHours ?? DEFAULT_BUSINESS_HOURS,
    collisionPolicy: options.collisionPolicy ?? "allow",
    defaultEventColor: options.defaultEventColor,
    hideEmptyResources: options.hideEmptyResources ?? false,
    interactive: options.interactive ?? false,
    now,
    onDraftChange: options.onDraftChange,
    onEventCopy: options.onEventCopy,
    onEventCreate: options.onEventCreate,
    onEventSelect: options.onEventSelect,
    resources: options.resources ?? [],
    showCurrentTimeIndicator: options.showCurrentTimeIndicator ?? true,
    weekStartsOn: options.weekStartsOn ?? DEFAULT_WEEK_START
  };
}

function resolveCalendarOptions(options: CalendarOptions, now: Date): ResolvedCalendarOptions {
  const compact = options.compact ?? false;
  const slot = resolveSlotOptions(options);
  return {
    ...resolveDisplayDefaults(options, now),
    compact,
    minimumDurationMinutes: slot.minimumDurationMinutes,
    slotHeightPx: getSlotHeightPx(compact),
    slotMinutes: slot.slotMinutes,
    snapMinutes: slot.snapMinutes
  };
}

/**
 * Throws when interactive mode is configured with invalid minute values, so the
 * error surfaces immediately instead of silently failing on the first drag.
 */
function assertInteractiveOptions(interactive: boolean | undefined, snapMinutes: number, minimumDurationMinutes: number): void {
  if (!interactive) return;
  if (!Number.isFinite(snapMinutes) || snapMinutes <= 0) {
    throw new Error(`createCalendar: snapMinutes must be a positive number, got ${String(snapMinutes)}`);
  }
  if (!Number.isFinite(minimumDurationMinutes) || minimumDurationMinutes <= 0) {
    throw new Error(`createCalendar: minimumDurationMinutes must be a positive number, got ${String(minimumDurationMinutes)}`);
  }
}
