/* eslint-disable jsdoc/require-jsdoc, max-lines-per-function -- Closure state and its mutators must stay colocated; private helpers are documented at the exported-function level only. */
import { createCalendar } from "../calendar";

import { applyDraftToEvents } from "./apply-draft";
import { buildDemoEvents, DEMO_RESOURCES } from "./demo-events";
import { buildEventColorPanel } from "./render-event-color-panel";
import { buildPlaygroundGuide } from "./render-guide";
import { buildPlaygroundToolbar } from "./render-toolbar";

import type { PlaygroundToolbarHandlers } from "./render-toolbar";
import type { CalendarDraftChange, CalendarEvent, CalendarInstance, CalendarView } from "../types";

/**
 * Analytics-agnostic payload emitted for a playground interaction.
 */
export interface PlaygroundInteractionEvent {
  type: "toolbar_change" | "calendar_edit";
  detail?: Record<string, unknown>;
}

export interface PlaygroundOptions {
  onInteraction?: (event: PlaygroundInteractionEvent) => void;
}

export interface PlaygroundInstance {
  mount: (host: HTMLElement) => void;
  destroy: () => void;
}

interface PlaygroundState {
  compact: boolean;
  date: string;
  defaultEventColor?: string;
  draftLog: string;
  events: CalendarEvent[];
  interactive: boolean;
  showResources: boolean;
  slotMinutes: number;
  view: CalendarView;
  weekStartsOn: number;
}

const INITIAL_DATE = "2026-07-08";

/**
 * Creates the interactive playground: a live `createCalendar` instance wired to toolbar
 * controls, per-event color pickers, and a "How to do that" guide with matching code samples.
 */
export function createPlayground(options: PlaygroundOptions = {}): PlaygroundInstance {
  let host: HTMLElement | null = null;
  let calendar: CalendarInstance | null = null;
  let toolbarSlot: HTMLElement | null = null;
  let colorPanelSlot: HTMLElement | null = null;
  let logSlot: HTMLElement | null = null;
  let calendarContainer: HTMLElement | null = null;

  let state: PlaygroundState = {
    compact: false,
    date: INITIAL_DATE,
    defaultEventColor: "#6264a7",
    draftLog: "No interactions yet.",
    events: buildDemoEvents(new Date(`${INITIAL_DATE}T12:00:00.000Z`)),
    interactive: true,
    showResources: false,
    slotMinutes: 60,
    view: "week",
    weekStartsOn: 1
  };

  function setState(partial: Partial<PlaygroundState>): void {
    state = { ...state, ...partial };
    render();
  }

  function trackedSetState(field: string, partial: Partial<PlaygroundState>): void {
    setState(partial);
    options.onInteraction?.({ type: "toolbar_change", detail: { field } });
  }

  function handleDraftChange(change: CalendarDraftChange): void {
    setState({ events: applyDraftToEvents(state.events, change), draftLog: formatDraftLog(change) });
    options.onInteraction?.({
      type: "calendar_edit",
      detail: { kind: change.kind, hasCollisionWarning: change.hasCollisionWarning }
    });
  }

  function handleEventColorChange(eventId: string, color: string | undefined): void {
    setState({ events: state.events.map((event) => (event.id === eventId ? { ...event, color } : event)) });
  }

  function handleDateChange(date: string): void {
    const events = mergeDemoEvents(state.events, new Date(`${date}T12:00:00.000Z`));
    trackedSetState("date", { date, events });
  }

  function buildToolbarHandlers(): PlaygroundToolbarHandlers {
    return {
      onCompactChange: (compact: boolean) => {
        trackedSetState("compact", { compact });
      },
      onDateChange: handleDateChange,
      onDefaultEventColorChange: (defaultEventColor: string | undefined) => {
        trackedSetState("defaultEventColor", { defaultEventColor });
      },
      onInteractiveChange: (interactive: boolean) => {
        trackedSetState("interactive", { interactive });
      },
      onShowResourcesChange: (showResources: boolean) => {
        trackedSetState("showResources", { showResources });
      },
      onSlotMinutesChange: (slotMinutes: number) => {
        trackedSetState("slotMinutes", { slotMinutes });
      },
      onViewChange: (view: CalendarView) => {
        trackedSetState("view", { view });
      },
      onWeekStartsOnChange: (weekStartsOn: number) => {
        trackedSetState("weekStartsOn", { weekStartsOn });
      }
    };
  }

  function renderCalendar(container: HTMLElement): void {
    const calendarOptions = {
      compact: state.compact,
      date: new Date(`${state.date}T12:00:00.000Z`),
      defaultEventColor: state.defaultEventColor,
      events: state.events,
      interactive: state.interactive && state.view !== "month",
      now: new Date(`${state.date}T13:00:00.000Z`),
      onDraftChange: handleDraftChange,
      resources: state.showResources ? DEMO_RESOURCES : [],
      slotMinutes: state.slotMinutes,
      view: state.view,
      weekStartsOn: state.weekStartsOn
    };
    if (calendar) {
      calendar.setOptions(calendarOptions);
    } else {
      calendar = createCalendar(calendarOptions);
      calendar.mount(container);
    }
  }

  function isMounted(): boolean {
    return Boolean(host && toolbarSlot && colorPanelSlot && logSlot && calendarContainer);
  }

  function render(): void {
    if (!isMounted()) return;

    toolbarSlot?.replaceChildren(buildPlaygroundToolbar(state, buildToolbarHandlers()));
    colorPanelSlot?.replaceChildren(buildEventColorPanel(state.events, handleEventColorChange));
    if (calendarContainer) renderCalendar(calendarContainer);

    const log = document.createElement("pre");
    log.textContent = state.draftLog;
    logSlot?.replaceChildren(log);
  }

  return {
    mount(newHost: HTMLElement): void {
      host = newHost;
      const shell = buildShell();
      toolbarSlot = shell.toolbarSlot;
      colorPanelSlot = shell.colorPanelSlot;
      logSlot = shell.logSlot;
      calendarContainer = shell.calendarContainer;
      host.replaceChildren(shell.root);
      render();
    },
    destroy(): void {
      calendar?.destroy();
      calendar = null;
      host?.replaceChildren();
      host = null;
      toolbarSlot = null;
      colorPanelSlot = null;
      logSlot = null;
      calendarContainer = null;
    }
  };
}

interface PlaygroundShell {
  calendarContainer: HTMLElement;
  colorPanelSlot: HTMLElement;
  logSlot: HTMLElement;
  root: HTMLElement;
  toolbarSlot: HTMLElement;
}

function buildShell(): PlaygroundShell {
  const root = document.createElement("div");
  root.className = "playground";

  const header = document.createElement("header");
  header.className = "playground__header";
  const heading = document.createElement("h1");
  heading.textContent = "ScheduleSpark Calendar Playground";
  const intro = document.createElement("p");
  const introCode = document.createElement("code");
  introCode.textContent = "@schedulespark/calendar";
  const introLink = document.createElement("a");
  introLink.className = "playground__header-link";
  introLink.href = "#playground-guide-title";
  introLink.textContent = "How to do that";
  intro.append("Interactive preview of ", introCode, ". Tweak the toolbar, then read ", introLink, " for matching code.");
  header.append(heading, intro);

  const toolbarSlot = document.createElement("div");
  const colorPanelSlot = document.createElement("div");

  const calendarWrapper = document.createElement("div");
  calendarWrapper.className = "playground__calendar";
  const calendarContainer = document.createElement("div");
  calendarWrapper.appendChild(calendarContainer);

  const logSection = document.createElement("section");
  logSection.className = "playground__log";
  const logHeading = document.createElement("h2");
  logHeading.textContent = "Last draft change";
  const logSlot = document.createElement("div");
  logSection.append(logHeading, logSlot);

  root.append(header, buildPlaygroundGuide(), toolbarSlot, colorPanelSlot, calendarWrapper, logSection);

  return { calendarContainer, colorPanelSlot, logSlot, root, toolbarSlot };
}

function formatDraftLog(change: CalendarDraftChange): string {
  return JSON.stringify(
    {
      ...change,
      start: change.start.toISOString(),
      end: change.end.toISOString()
    },
    null,
    2
  );
}

function mergeDemoEvents(current: CalendarEvent[], anchorDate: Date): CalendarEvent[] {
  const colorById = new Map(current.map((event) => [event.id, event.color]));
  return buildDemoEvents(anchorDate).map((event) => ({
    ...event,
    color: colorById.get(event.id)
  }));
}
