/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import { getColumnLabel, getEventLabel } from "../accessibility";
import { getAllDayEventStyle, resolveEventColor } from "../core/event-colors";

import type { ResolvedCalendarOptions } from "../calendar";
import type { ScrollSyncController } from "../interactions";
import type { CalendarEvent, CalendarResource } from "../types";

export interface AllDayRowContext {
  readonly columns: (Date | CalendarResource)[];
  day: Date;
  readonly events: CalendarEvent[];
  options: ResolvedCalendarOptions;
  scrollSync: ScrollSyncController;
  usesResourceLanes: boolean;
}

/**
 * Builds the all-day event row shown above the time grid.
 */
export function buildAllDayRow(context: AllDayRowContext): HTMLElement {
  const row = document.createElement("div");
  row.className = "sscal__all-day";
  row.setAttribute("role", "row");
  row.setAttribute("aria-label", "All day");

  const label = document.createElement("div");
  label.className = "sscal__all-day-label";
  label.setAttribute("aria-hidden", "true");
  label.textContent = "All day";
  row.appendChild(label);

  const scrollRegion = document.createElement("div");
  scrollRegion.className = "sscal__columns-scroll";
  context.scrollSync.register(scrollRegion);

  const columnsRow = document.createElement("div");
  columnsRow.className = "sscal__all-day-columns";
  const eventsByColumn = indexAllDayEventsByColumn(context);
  for (const column of context.columns) {
    columnsRow.appendChild(buildAllDayCell(column, eventsByColumn.get(getColumnKey(column)) ?? [], context.options.defaultEventColor));
  }
  scrollRegion.appendChild(columnsRow);
  row.appendChild(scrollRegion);

  return row;
}

function buildAllDayCell(column: Date | CalendarResource, events: CalendarEvent[], defaultEventColor: string | undefined): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "sscal__all-day-cell";
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-label", getColumnLabel(column));

  for (const event of events) {
    const color = resolveEventColor(event, defaultEventColor);
    const chip = document.createElement("div");
    chip.className = `sscal__all-day-event${color ? "" : " sscal__all-day-event--uncolored"}`;
    chip.setAttribute("role", "group");
    chip.setAttribute("aria-label", getEventLabel(event));
    const style = getAllDayEventStyle(color);
    if (style?.backgroundColor) chip.style.backgroundColor = style.backgroundColor;
    chip.textContent = event.title;
    cell.appendChild(chip);
  }

  return cell;
}

interface AllDayColumnContext {
  column: Date | CalendarResource;
  key: string;
  dayStart: Date;
  dayEnd: Date;
}

function indexAllDayEventsByColumn(context: AllDayRowContext): Map<string, CalendarEvent[]> {
  const columnContexts = context.columns.map((column): AllDayColumnContext => {
    const eventDay = context.usesResourceLanes ? context.day : column instanceof Date ? column : context.day;
    const dayStart = startOfUtcDay(eventDay);
    return { column, key: getColumnKey(column), dayStart, dayEnd: addUtcDays(dayStart, 1) };
  });

  const buckets = new Map(columnContexts.map((ctx) => [ctx.key, [] as CalendarEvent[]]));

  for (const event of context.events) {
    for (const ctx of columnContexts) {
      if (!matchesAllDayColumn(ctx, event, context.usesResourceLanes)) continue;
      buckets.get(ctx.key)?.push(event);
    }
  }

  return buckets;
}

function matchesAllDayColumn(ctx: AllDayColumnContext, event: CalendarEvent, usesResourceLanes: boolean): boolean {
  if (!intervalsOverlap(event.start, event.end, ctx.dayStart, ctx.dayEnd)) return false;
  if (usesResourceLanes && !(ctx.column instanceof Date)) return event.resourceId === ctx.column.id;
  return true;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function intervalsOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function getColumnKey(column: Date | CalendarResource): string {
  return column instanceof Date ? column.toISOString() : column.id;
}
