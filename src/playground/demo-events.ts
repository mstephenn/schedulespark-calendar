import type { CalendarEvent } from "../types";

// eslint-disable-next-line jsdoc/require-jsdoc -- playground demo constant, not a documented public API
export const DEMO_RESOURCES = [
  { id: "worker-1", title: "Ada", subtitle: "Opening" },
  { id: "worker-2", title: "Grace", subtitle: "Front desk" },
  { id: "worker-3", title: "Lin", subtitle: "Closing" }
];

/**
 * Builds the default demo events shown in the calendar playground.
 */
export function buildDemoEvents(anchorDate: Date): CalendarEvent[] {
  const monday = startOfUtcWeek(anchorDate, 1);

  return [
    {
      id: "standup",
      title: "Weekly standup",
      color: "#0078d4",
      start: addUtcHours(monday, 9),
      end: addUtcHours(monday, 9.5),
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    },
    {
      id: "morning-ada",
      title: "Morning shift",
      color: "#107c10",
      resourceId: "worker-1",
      start: addUtcHours(monday, 8),
      end: addUtcHours(monday, 12)
    },
    {
      id: "afternoon-grace",
      title: "Afternoon shift",
      color: "#c239b3",
      resourceId: "worker-2",
      start: addUtcHours(addUtcDays(monday, 1), 12),
      end: addUtcHours(addUtcDays(monday, 1), 17)
    },
    {
      id: "site-closed",
      title: "Site closed",
      color: "#e81123",
      allDay: true,
      start: addUtcDays(monday, 2),
      end: addUtcDays(monday, 3)
    },
    {
      id: "closing-lin",
      title: "Closing shift",
      color: "#ff8c00",
      resourceId: "worker-3",
      start: addUtcHours(addUtcDays(monday, 4), 14),
      end: addUtcHours(addUtcDays(monday, 4), 22)
    }
  ];
}

/**
 * Returns the UTC week start for the given anchor date.
 */
function startOfUtcWeek(date: Date, weekStartsOn: number): Date {
  const day = startOfUtcDay(date);
  const diff = (day.getUTCDay() - weekStartsOn + 7) % 7;
  return addUtcDays(day, -diff);
}

/**
 * Returns midnight UTC for the given date.
 */
function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Shifts a UTC date by the given number of days.
 */
function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Shifts a UTC date by the given number of hours.
 */
function addUtcHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
