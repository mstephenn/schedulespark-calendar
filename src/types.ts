/**
 * Calendar view modes supported by the first package slice.
 */
export type CalendarView = "day" | "week" | "workweek" | "month";

export interface BusinessHours {
  /** Inclusive start time in HH:mm (UTC). */
  start: string;
  /** Exclusive end time in HH:mm (UTC). Use `24:00` for end of day. */
  end: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  /** Explicit event color supplied by the consumer. The calendar does not assign colors automatically. */
  color?: string;
  recurrenceRule?: string;
  recurrenceId?: string;
  /** When true, the event is rendered in the all-day header row instead of the time grid. */
  allDay?: boolean;
  /** Optional display metadata for schedule-oriented consumers. */
  roleName?: string;
  /** Optional status label for schedule-oriented consumers. */
  status?: string;
  /** Optional worker/resource display name for schedule-oriented consumers. */
  workerName?: string;
}

export interface CalendarResource {
  id: string;
  title: string;
  subtitle?: string;
  color?: string;
}

export interface VisibleRange {
  start: Date;
  end: Date;
  days: Date[];
  view: CalendarView;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface EventLayout {
  event: CalendarEvent;
  eventId: string;
  dayIndex: number;
  resourceIndex?: number;
  topPercent: number;
  heightPercent: number;
}

/**
 * Calendar interaction modes that can produce a draft event change.
 */
export type CalendarInteractionKind = "move" | "resize-start" | "resize-end";

/**
 * Collision policy used when an interaction draft overlaps another event.
 */
export type CollisionPolicy = "allow" | "reject-overlap";

/**
 * Immutable draft emitted after a calendar interaction completes.
 */
export interface CalendarDraftChange {
  eventId: string;
  kind: CalendarInteractionKind;
  start: Date;
  end: Date;
  resourceId?: string;
  /** Informational: the draft was cleared by the configured collision policy. True only when `collisionPolicy` is `"allow"` and the draft overlaps another event. */
  hasCollisionWarning: boolean;
}

/**
 * Options accepted by `createCalendar`.
 */
export interface CalendarOptions {
  date: Date;
  events: CalendarEvent[];
  view: CalendarView;
  businessHours?: BusinessHours;
  collisionPolicy?: CollisionPolicy;
  compact?: boolean;
  /** Explicit fallback fill when an event omits `color`. The calendar never assigns colors automatically. */
  defaultEventColor?: string;
  /** When true, resource columns with no events in the current visible range are hidden by default. A user's manual show/hide always overrides this. */
  hideEmptyResources?: boolean;
  /** Enables pointer and keyboard move/resize. Requires `onDraftChange` to actually apply changes. */
  interactive?: boolean;
  minimumDurationMinutes?: number;
  now?: Date;
  /** Called after a move/resize interaction completes. The calendar is controlled: it does not persist the change itself. */
  onDraftChange?: (change: CalendarDraftChange) => void;
  /** Called when Ctrl/Cmd+drag duplicates an existing event onto a new time/column, instead of moving it. */
  onEventCopy?: (input: { sourceEvent: CalendarEvent; start: Date; end: Date; resourceId?: string }) => void;
  /** Called when a click or drag on empty grid space creates a new event. Only wired when `interactive` and this are both set. */
  onEventCreate?: (input: { start: Date; end: Date; resourceId?: string }) => void;
  /** Called when an event is activated (click, or Enter/Space when focused). */
  onEventSelect?: (event: CalendarEvent) => void;
  resources?: CalendarResource[];
  showCurrentTimeIndicator?: boolean;
  slotMinutes?: number;
  snapMinutes?: number;
  timeZone?: string;
  weekStartsOn?: number;
}

/**
 * Handle returned by `createCalendar`.
 */
export interface CalendarInstance {
  mount: (host: HTMLElement) => void;
  destroy: () => void;
  setDate: (date: Date) => void;
  setEvents: (events: CalendarEvent[]) => void;
  /** Merges the given options into the current options and re-renders. Use for any option beyond date/events/view. */
  setOptions: (options: Partial<CalendarOptions>) => void;
  setView: (view: CalendarView) => void;
}
