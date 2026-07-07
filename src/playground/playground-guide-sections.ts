/** One playground guide entry with preview copy and matching app code. */
export interface PlaygroundGuideSection {
  code: string;
  title: string;
  tryIt: string;
}

/* eslint-disable jsdoc/require-jsdoc -- playground guide content constants */
export const PLAYGROUND_GUIDE_SECTIONS: PlaygroundGuideSection[] = [
  {
    title: "Install and render",
    tryIt: "The calendar below is already running. Scroll the grid and switch views to explore.",
    code: `npm install @schedulespark/calendar @schedulespark/rrule

import { createCalendar } from "@schedulespark/calendar";
import "@schedulespark/calendar/styles.css";

const calendar = createCalendar({
  date: new Date("2026-07-08T12:00:00.000Z"),
  view: "week",
  events: [
    {
      id: "shift-1",
      title: "Morning shift",
      start: new Date("2026-07-06T08:00:00.000Z"),
      end: new Date("2026-07-06T12:00:00.000Z"),
    },
  ],
});

calendar.mount(document.querySelector("#calendar"));`
  },
  {
    title: "Views, date, and week start",
    tryIt: 'Change View, Anchor date, and Week starts on in the toolbar. Work week hides Saturday and Sunday.',
    code: `calendar.setOptions({
  date: anchorDate,
  view: "workweek",       // "day" | "week" | "workweek" | "month"
  weekStartsOn: 1,        // 0 = Sunday, 1 = Monday
});`
  },
  {
    title: "Slot size and compact density",
    tryIt: "Pick 15, 30, or 60 minute slots. Toggle Compact density for a tighter row height.",
    code: `calendar.setOptions({
  view: "week",
  slotMinutes: 30,
  compact: true,
});`
  },
  {
    title: "Drag, drop, and resize shifts",
    tryIt: "With Interactive enabled, drag an event to move it or drag its top/bottom edge to resize. Month view disables interaction. Watch Last draft change for the payload.",
    code: `let events = initialEvents;

function handleDraftChange(change) {
  events = events.map((event) =>
    event.id === change.eventId
      ? {
          ...event,
          start: change.start,
          end: change.end,
          resourceId: change.resourceId ?? event.resourceId,
        }
      : event,
  );
  calendar.setEvents(events);
}

const calendar = createCalendar({
  interactive: view !== "month",
  onDraftChange: handleDraftChange,
  slotMinutes: 60,
  snapMinutes: 15,
  minimumDurationMinutes: 30,
  collisionPolicy: "allow",
  events,
  view,
  date: anchorDate,
});`
  },
  {
    title: "Event colors",
    tryIt: "Set a default color in the toolbar or pick per-event colors in Event colors. Clear falls back to the default — the calendar never auto-assigns colors.",
    code: `calendar.setOptions({
  defaultEventColor: "#6264a7",
  events: [
    {
      id: "shift-1",
      title: "Opening",
      color: "#4f6bed",
      start,
      end,
    },
  ],
});`
  },
  {
    title: "Resource lanes (day view)",
    tryIt: 'Switch to Day view, then enable Resource lanes. Events with resourceId line up under each worker column.',
    code: `const resources = [
  { id: "worker-1", title: "Ada", subtitle: "Opening" },
  { id: "worker-2", title: "Grace", subtitle: "Front desk" },
];

calendar.setOptions({
  view: "day",
  resources,
  events: [
    {
      id: "shift-1",
      title: "Morning shift",
      resourceId: "worker-1",
      start,
      end,
    },
  ],
});`
  },
  {
    title: "Recurring and all-day events",
    tryIt: "Weekly standup repeats on Mon/Wed/Fri. Site closed spans the all-day row.",
    code: `calendar.setEvents([
  {
    id: "standup",
    title: "Weekly standup",
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    start,
    end,
  },
  {
    id: "holiday",
    title: "Site closed",
    allDay: true,
    start: new Date("2026-07-08T00:00:00.000Z"),
    end: new Date("2026-07-09T00:00:00.000Z"),
  },
]);`
  },
  {
    title: "Mobile and narrow screens",
    tryIt: "Shrink the browser or open on a phone. Week and work-week views scroll horizontally — headers stay aligned with the grid. Day view fits one column; month view compresses to the screen width.",
    code: `// Week/work-week: swipe sideways to see more days.
// Touch drag works when Interactive is on.

calendar.setOptions({
  view: "week",       // or "day" on very narrow layouts
  compact: true,      // tighter rows on small screens
  date: anchorDate,
});

// CSS variables adjust automatically below 768px:
// narrower time gutter, 72–80px day columns, larger touch resize handles.`
  },
  {
    title: "Headless layout (framework-agnostic core)",
    tryIt: "Not shown here — use core utilities when you need fully custom rendering instead of createCalendar.",
    code: `import { getVisibleRange, layoutEvents } from "@schedulespark/calendar/core";

const range = getVisibleRange({
  date: anchorDate,
  view: "week",
  weekStartsOn: 1,
});

const layouts = layoutEvents({
  range,
  businessHours: { start: "00:00", end: "24:00" },
  events,
});`
  }
];
