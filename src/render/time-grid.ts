/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import { getColumnLabel } from "../accessibility";
import { isTimeGridView } from "../core/month-grid";
import { layoutResourceEvents } from "../core/resource-layout";
import { formatDayNumber, formatWeekday, generateTimeSlots, isSameUtcDay, layoutEvents } from "../core/time-grid";
import { createScrollSync } from "../interactions";

import { buildAllDayRow } from "./all-day-row";
import { buildTimeGridBody } from "./time-grid-body";

import type { InteractionRegistry, ResolvedCalendarOptions } from "../calendar";
import type { ColumnVisibilityController } from "../column-visibility";
import type { getVisibleRange } from "../core/time-grid";
import type { ScrollSyncController } from "../interactions";
import type { CalendarEvent, CalendarResource, CalendarView, EventLayout, TimeSlot } from "../types";

export interface TimeGridContext {
  columnVisibility: ColumnVisibilityController;
  readonly events: CalendarEvent[];
  interactionRegistry: InteractionRegistry;
  options: ResolvedCalendarOptions;
  view: CalendarView;
  range: ReturnType<typeof getVisibleRange>;
}

/**
 * Builds the day/week/work-week time-grid view: sticky header, optional all-day row, and the
 * scrollable time grid body, with horizontal scroll-sync across all three regions.
 */
export function renderTimeGridCalendar(context: TimeGridContext): HTMLElement {
  if (!isTimeGridView(context.view)) {
    throw new Error(`Expected a time-grid view, received ${context.view}`);
  }

  const model = buildTimeGridModel(context);
  const scrollSync = createScrollSync();

  const root = document.createElement("section");
  root.setAttribute("aria-label", "Schedule calendar");
  root.className = `sscal sscal--${context.view}${context.options.compact ? " sscal--compact" : ""}`;
  root.setAttribute("role", "grid");
  root.style.setProperty("--sscal-column-count", String(model.columns.length));
  root.style.setProperty("--sscal-slot-count", String(model.slots.length));
  root.style.setProperty("--sscal-slot-height", `${String(context.options.slotHeightPx)}px`);

  root.appendChild(buildHeader(model.columns, context.options.now, scrollSync, model.usesResourceLanes ? context.columnVisibility : null));
  if (model.usesResourceLanes && model.hiddenResources.length > 0) {
    root.appendChild(buildHiddenResourceToggles(model.hiddenResources, context.columnVisibility));
  }
  if (model.allDayEvents.length > 0) {
    root.appendChild(
      buildAllDayRow({
        columns: model.columns,
        day: context.range.start,
        events: model.allDayEvents,
        options: context.options,
        scrollSync,
        usesResourceLanes: model.usesResourceLanes
      })
    );
  }
  const liveRegion = buildLiveRegion();
  root.appendChild(buildTimeGridBody(model, context, scrollSync, (message) => {
    liveRegion.textContent = message;
  }));
  root.appendChild(liveRegion);

  return root;
}

/**
 * A visually hidden `aria-live` region announcing rejected keyboard interactions (e.g. a
 * resize that would violate the minimum duration), since there is no other visible feedback
 * for keyboard/assistive-technology users in that case.
 */
function buildLiveRegion(): HTMLElement {
  const region = document.createElement("div");
  region.className = "sr-only";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  return region;
}

export interface TimeGridModel {
  allDayEvents: CalendarEvent[];
  columns: (Date | CalendarResource)[];
  hiddenResources: CalendarResource[];
  layouts: EventLayout[];
  slots: TimeSlot[];
  timedEvents: CalendarEvent[];
  usesResourceLanes: boolean;
  /**
   * The resources `layouts`' `resourceIndex` values are positions into — i.e. the same
   * (possibly hidden-filtered) list passed to `layoutResourceEvents`. Interaction code must
   * index into this list, not `options.resources`, or a hidden column desyncs the two lists
   * and interactions silently reassign events to the wrong resource.
   */
  visibleResources: CalendarResource[];
}

function buildTimeGridModel(context: TimeGridContext): TimeGridModel {
  const { events, options, range, view } = context;
  const timedEvents = events.filter((event) => !event.allDay);
  const allDayEvents = events.filter((event) => event.allDay);
  const usesResourceLanes = view === "day" && options.resources.length > 0;
  const visibleResources = usesResourceLanes
    ? options.resources.filter((resource) => context.columnVisibility.isVisible(resource.id, hasEventsForResource(timedEvents, resource.id), options.hideEmptyResources))
    : options.resources;
  const hiddenResources = usesResourceLanes ? options.resources.filter((resource) => !visibleResources.includes(resource)) : [];
  const columns = usesResourceLanes ? visibleResources : range.days;
  const slots = generateTimeSlots({
    day: range.days[0] ?? range.start,
    businessHours: options.businessHours,
    slotMinutes: options.slotMinutes
  });
  const layouts = usesResourceLanes
    ? layoutResourceEvents({
        day: range.start,
        events: timedEvents,
        resources: visibleResources,
        businessHours: options.businessHours
      })
    : layoutEvents({ events: timedEvents, range, businessHours: options.businessHours });

  return { allDayEvents, columns, hiddenResources, layouts, slots, timedEvents, usesResourceLanes, visibleResources };
}

function hasEventsForResource(events: CalendarEvent[], resourceId: string): boolean {
  return events.some((event) => event.resourceId === resourceId);
}

function buildHeader(
  columns: (Date | CalendarResource)[],
  now: Date,
  scrollSync: ScrollSyncController,
  columnVisibility: ColumnVisibilityController | null
): HTMLElement {
  const header = document.createElement("div");
  header.className = "sscal__header";

  const gutter = document.createElement("div");
  gutter.className = "sscal__time-gutter";
  gutter.setAttribute("aria-hidden", "true");
  header.appendChild(gutter);

  const scrollRegion = document.createElement("div");
  scrollRegion.className = "sscal__columns-scroll";
  scrollSync.register(scrollRegion);

  const columnsRow = document.createElement("div");
  columnsRow.className = "sscal__header-columns";
  columnsRow.setAttribute("role", "row");
  for (const column of columns) columnsRow.appendChild(buildColumnHeader(column, now, columnVisibility));
  scrollRegion.appendChild(columnsRow);
  header.appendChild(scrollRegion);

  return header;
}

function buildColumnHeader(column: Date | CalendarResource, now: Date, columnVisibility: ColumnVisibilityController | null): HTMLElement {
  const cell = document.createElement("div");
  cell.setAttribute("role", "columnheader");
  cell.setAttribute("aria-label", getColumnLabel(column));

  if (column instanceof Date) {
    const isToday = isSameUtcDay(column, now);
    cell.className = `sscal__day-header${isToday ? " sscal__day-header--today" : ""}`;
    const weekday = document.createElement("span");
    weekday.className = "sscal__day-header-weekday";
    weekday.textContent = formatWeekday(column);
    const dayNumber = document.createElement("span");
    dayNumber.className = "sscal__day-header-date";
    dayNumber.textContent = formatDayNumber(column);
    cell.append(weekday, dayNumber);
    return cell;
  }

  cell.className = "sscal__day-header";
  const title = document.createElement("span");
  title.className = "sscal__day-header-weekday";
  title.textContent = column.title;
  cell.appendChild(title);
  if (column.subtitle) {
    const subtitle = document.createElement("small");
    subtitle.textContent = column.subtitle;
    cell.appendChild(subtitle);
  }
  if (columnVisibility) {
    cell.classList.add("sscal__day-header--toggleable");
    cell.addEventListener("click", () => {
      columnVisibility.hide(column.id);
    });
  }
  return cell;
}

function buildHiddenResourceToggles(hiddenResources: CalendarResource[], columnVisibility: ColumnVisibilityController): HTMLElement {
  const strip = document.createElement("div");
  strip.className = "sscal__resource-toggles";
  strip.setAttribute("aria-label", "Hidden resources");
  for (const resource of hiddenResources) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "sscal__resource-toggle";
    chip.textContent = resource.title;
    chip.addEventListener("click", () => {
      columnVisibility.show(resource.id);
    });
    strip.appendChild(chip);
  }
  return strip;
}

