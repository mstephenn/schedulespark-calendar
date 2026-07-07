/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import { getColumnLabel } from "../accessibility";
import { getCurrentTimeIndicatorPercent } from "../core/time-grid";
import { startGridCreateInteraction } from "../interactions";

import { renderEventBlock } from "./event";

import type { TimeGridContext, TimeGridModel } from "./time-grid";
import type { GridCreateContext, ScrollSyncController } from "../interactions";
import type { CalendarResource, TimeSlot } from "../types";

/**
 * Builds the scrollable time-grid body: time rail, day/resource columns, the current-time
 * indicator, and event blocks.
 */
export function buildTimeGridBody(
  model: TimeGridModel,
  context: TimeGridContext,
  scrollSync: ScrollSyncController,
  announce: (message: string) => void
): HTMLElement {
  const body = document.createElement("div");
  body.className = "sscal__body";
  body.appendChild(buildTimeRail(model.slots));

  const scrollRegion = document.createElement("div");
  scrollRegion.className = "sscal__columns-scroll";
  scrollSync.register(scrollRegion);

  const daysRow = document.createElement("div");
  daysRow.className = "sscal__days";
  daysRow.setAttribute("role", "row");

  model.columns.forEach((column, columnIndex) => {
    const cell = buildDayColumn(column, model.slots.length);
    daysRow.appendChild(cell);
    wireGridCreate({ cell, column, columnIndex, context, daysRow, model });
  });

  if (context.options.showCurrentTimeIndicator) {
    for (const indicator of buildCurrentTimeIndicators(model, context)) daysRow.appendChild(indicator);
  }

  const eventContext = {
    announce,
    businessHours: context.options.businessHours,
    collisionPolicy: context.options.collisionPolicy,
    defaultEventColor: context.options.defaultEventColor,
    events: model.timedEvents,
    interactionRegistry: context.interactionRegistry,
    interactive: context.options.interactive,
    minimumDurationMinutes: context.options.minimumDurationMinutes,
    onDraftChange: context.options.onDraftChange,
    onEventCopy: context.options.onEventCopy,
    onEventSelect: context.options.onEventSelect,
    resources: model.visibleResources,
    slotHeightPx: context.options.slotHeightPx,
    slotMinutes: context.options.slotMinutes,
    snapMinutes: context.options.snapMinutes,
    usesResourceLanes: model.usesResourceLanes,
    visibleDays: context.range.days
  };
  for (const layout of model.layouts) daysRow.appendChild(renderEventBlock(layout, eventContext));

  scrollRegion.appendChild(daysRow);
  body.appendChild(scrollRegion);

  return body;
}

function buildTimeRail(slots: TimeSlot[]): HTMLElement {
  const rail = document.createElement("div");
  rail.className = "sscal__time-rail";
  rail.setAttribute("aria-hidden", "true");
  for (const slot of slots) {
    const label = document.createElement("div");
    label.className = "sscal__time-label";
    label.textContent = formatSlotTime(slot.start);
    rail.appendChild(label);
  }
  return rail;
}

function buildDayColumn(column: Date | CalendarResource, slotCount: number): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "sscal__day-column";
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-label", getColumnLabel(column));
  cell.style.setProperty("--sscal-slot-count", String(slotCount));
  return cell;
}

interface WireGridCreateInput {
  cell: HTMLElement;
  column: Date | CalendarResource;
  columnIndex: number;
  context: TimeGridContext;
  daysRow: HTMLElement;
  model: TimeGridModel;
}

function wireGridCreate(input: WireGridCreateInput): void {
  const { cell, column, columnIndex, context, daysRow, model } = input;
  if (!context.options.interactive || !context.options.onEventCreate) return;
  const day = model.usesResourceLanes ? context.range.start : column;
  if (!(day instanceof Date)) return;
  const resourceId = column instanceof Date ? undefined : column.id;

  cell.addEventListener("pointerdown", (event) => {
    startGridCreateInteraction({ cell, columnIndex, context: buildGridCreateContext(context), day, daysRow, resourceId }, event);
  });
}

function buildGridCreateContext(context: TimeGridContext): GridCreateContext {
  return {
    businessHours: context.options.businessHours,
    interactionRegistry: context.interactionRegistry,
    minimumDurationMinutes: context.options.minimumDurationMinutes,
    onEventCreate: context.options.onEventCreate,
    slotHeightPx: context.options.slotHeightPx,
    slotMinutes: context.options.slotMinutes,
    snapMinutes: context.options.snapMinutes
  };
}

function buildCurrentTimeIndicators(model: TimeGridModel, context: TimeGridContext): HTMLElement[] {
  const indicators: HTMLElement[] = [];
  model.columns.forEach((column, columnIndex) => {
    const indicatorDay = model.usesResourceLanes ? context.range.start : column;
    if (!(indicatorDay instanceof Date)) return;
    const topPercent = getCurrentTimeIndicatorPercent(indicatorDay, context.options.businessHours, context.options.now);
    if (topPercent === null) return;

    const indicator = document.createElement("div");
    indicator.className = "sscal__now-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.style.gridColumn = String(columnIndex + 1);
    indicator.style.top = `${String(topPercent)}%`;
    indicators.push(indicator);
  });
  return indicators;
}

function formatSlotTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}
