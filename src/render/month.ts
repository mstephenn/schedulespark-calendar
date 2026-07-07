/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import { formatUtcWeekdayLabel, getEventLabel, getMonthCellLabel } from "../accessibility";
import { getMonthEventStyle, resolveEventColor } from "../core/event-colors";
import { indexEventsByUtcDay, isSameUtcMonth, startOfUtcDay } from "../core/month-grid";
import { formatDayNumber, formatWeekday, isSameUtcDay } from "../core/time-grid";

import type { CalendarEvent } from "../types";

const MONTH_EVENT_LIMIT = 4;
const BASE_SUNDAY = new Date("2026-01-04T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MonthViewContext {
  anchorDate: Date;
  readonly days: Date[];
  defaultEventColor?: string;
  readonly events: CalendarEvent[];
  now: Date;
  weekStartsOn: number;
}

/**
 * Builds a month grid with per-day event chips.
 */
export function renderMonthView(context: MonthViewContext): HTMLElement {
  const eventsByDay = indexEventsByUtcDay(context.events, context.days);

  const root = document.createElement("div");
  root.className = "sscal__month";
  root.appendChild(buildWeekdayHeaderRow(context.weekStartsOn));

  const grid = document.createElement("div");
  grid.className = "sscal__month-grid";
  for (const week of chunkDaysIntoWeeks(context.days)) {
    grid.appendChild(buildWeekRow(week, context, eventsByDay));
  }
  root.appendChild(grid);

  return root;
}

function buildWeekdayHeaderRow(weekStartsOn: number): HTMLElement {
  const row = document.createElement("div");
  row.className = "sscal__month-weekdays";
  row.setAttribute("role", "row");

  for (const header of getWeekdayHeaders(weekStartsOn)) {
    const cell = document.createElement("div");
    cell.className = "sscal__month-weekday";
    cell.setAttribute("role", "columnheader");
    cell.setAttribute("aria-label", header.fullLabel);
    cell.textContent = header.shortLabel;
    row.appendChild(cell);
  }

  return row;
}

function buildWeekRow(week: Date[], context: MonthViewContext, eventsByDay: Map<number, CalendarEvent[]>): HTMLElement {
  const row = document.createElement("div");
  row.className = "sscal__month-week";
  row.setAttribute("role", "row");

  for (const day of week) {
    const dayEvents = eventsByDay.get(startOfUtcDay(day).getTime()) ?? [];
    row.appendChild(buildMonthDayCell(day, dayEvents, context));
  }

  return row;
}

function buildMonthDayCell(day: Date, events: CalendarEvent[], context: MonthViewContext): HTMLElement {
  const isToday = isSameUtcDay(day, context.now);
  const inCurrentMonth = isSameUtcMonth(day, context.anchorDate);
  const visibleEvents = events.slice(0, MONTH_EVENT_LIMIT);
  const hiddenCount = events.length - visibleEvents.length;

  const cell = document.createElement("div");
  cell.className = getMonthDayClassName(inCurrentMonth, isToday);
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-label", getMonthCellLabel(day, events.length));

  const dayNumber = document.createElement("div");
  dayNumber.className = "sscal__month-day-number";
  dayNumber.textContent = formatDayNumber(day);
  cell.appendChild(dayNumber);

  const eventsContainer = document.createElement("div");
  eventsContainer.className = "sscal__month-day-events";
  for (const event of visibleEvents) {
    eventsContainer.appendChild(buildMonthEventChip(event, context.defaultEventColor));
  }
  if (hiddenCount > 0) {
    const more = document.createElement("div");
    more.className = "sscal__month-more";
    more.textContent = `+${String(hiddenCount)} more`;
    eventsContainer.appendChild(more);
  }
  cell.appendChild(eventsContainer);

  return cell;
}

function getMonthDayClassName(inCurrentMonth: boolean, isToday: boolean): string {
  const classNames = ["sscal__month-day"];
  if (!inCurrentMonth) classNames.push("sscal__month-day--outside");
  if (isToday) classNames.push("sscal__month-day--today");
  return classNames.join(" ");
}

function buildMonthEventChip(event: CalendarEvent, defaultEventColor: string | undefined): HTMLElement {
  const color = resolveEventColor(event, defaultEventColor);

  const chip = document.createElement("div");
  chip.className = getMonthEventClassName(event, color);
  chip.setAttribute("role", "group");
  chip.setAttribute("aria-label", getEventLabel(event));
  chip.title = event.title;
  const style = getMonthEventStyle(color);
  if (style?.backgroundColor) chip.style.backgroundColor = style.backgroundColor;
  if (style?.borderLeftColor) chip.style.borderLeftColor = style.borderLeftColor;

  if (!event.allDay) {
    const time = document.createElement("span");
    time.className = "sscal__month-event-time";
    time.textContent = formatEventTime(event.start);
    chip.appendChild(time);
  }

  const title = document.createElement("span");
  title.className = "sscal__month-event-title";
  title.textContent = event.title;
  chip.appendChild(title);

  return chip;
}

function getMonthEventClassName(event: CalendarEvent, color: string | undefined): string {
  const classNames = ["sscal__month-event"];
  if (event.allDay) classNames.push("sscal__month-event--all-day");
  if (!color) classNames.push("sscal__month-event--uncolored");
  return classNames.join(" ");
}

function getWeekdayHeaders(weekStartsOn: number): { fullLabel: string; shortLabel: string }[] {
  const base = new Date(BASE_SUNDAY.getTime() + weekStartsOn * DAY_MS);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base.getTime() + index * DAY_MS);
    return {
      fullLabel: formatUtcWeekdayLabel(date),
      shortLabel: formatWeekday(date)
    };
  });
}

function chunkDaysIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function formatEventTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}
