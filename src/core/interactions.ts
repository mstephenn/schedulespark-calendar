import type {
  CalendarDraftChange,
  CalendarEvent,
  CalendarInteractionKind,
  CollisionPolicy
} from "../types";

interface BuildInteractionDraftInput {
  event: CalendarEvent;
  kind: CalendarInteractionKind;
  minuteDelta: number;
  snapMinutes: number;
  minimumDurationMinutes: number;
  events: CalendarEvent[];
  collisionPolicy: CollisionPolicy;
  collisionGroupBy: CollisionGroupBy;
  dayDelta?: number;
  resourceId?: string;
}

type CollisionGroupBy = "resourceId" | "day";

interface HasCollisionInput {
  draft: CalendarDraftChange;
  sourceEventId: string;
  events: CalendarEvent[];
  collisionGroupBy: CollisionGroupBy;
}

const MINUTES_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTES_MS;

/**
 * Builds an immutable draft event change from an interaction delta.
 */
export function buildInteractionDraft(input: BuildInteractionDraftInput): CalendarDraftChange | null {
  assertPositiveMinutes("snapMinutes", input.snapMinutes);
  assertPositiveMinutes("minimumDurationMinutes", input.minimumDurationMinutes);

  const snappedMinuteDelta = snapMinutes(input.minuteDelta, input.snapMinutes);
  const dayDeltaMs = (input.dayDelta ?? 0) * DAY_MS;
  const durationMs = input.event.end.getTime() - input.event.start.getTime();
  const minimumDurationMs = input.minimumDurationMinutes * MINUTES_MS;
  const bounds = resolveInteractionBounds({
    event: input.event,
    kind: input.kind,
    snappedMinuteDelta,
    dayDeltaMs,
    durationMs,
    minimumDurationMs
  });
  if (!bounds) return null;

  const draft: CalendarDraftChange = {
    eventId: input.event.id,
    kind: input.kind,
    start: bounds.start,
    end: bounds.end,
    resourceId: input.resourceId ?? input.event.resourceId,
    hasCollisionWarning: false
  };
  return finalizeDraft(draft, input);
}

interface ResolveInteractionBoundsInput {
  event: CalendarEvent;
  kind: CalendarInteractionKind;
  snappedMinuteDelta: number;
  dayDeltaMs: number;
  durationMs: number;
  minimumDurationMs: number;
}

/**
 * Resolves start/end after applying move or resize deltas.
 */
function resolveInteractionBounds(input: ResolveInteractionBoundsInput): { start: Date; end: Date } | null {
  if (input.kind === "move") {
    const deltaMs = input.snappedMinuteDelta * MINUTES_MS + input.dayDeltaMs;
    const start = new Date(input.event.start.getTime() + deltaMs);
    return { start, end: new Date(start.getTime() + input.durationMs) };
  }
  if (input.kind === "resize-start") {
    const start = applyResizeStart(
      input.event,
      input.snappedMinuteDelta,
      input.minimumDurationMs,
      input.durationMs
    );
    if (start === null) return null;
    return { start, end: new Date(input.event.end.getTime()) };
  }
  const end = applyResizeEnd(
    input.event,
    input.snappedMinuteDelta,
    input.minimumDurationMs,
    input.durationMs
  );
  if (end === null) return null;
  return { start: new Date(input.event.start.getTime()), end };
}

/**
 * Applies collision policy to a draft change.
 */
function finalizeDraft(
  draft: CalendarDraftChange,
  input: BuildInteractionDraftInput
): CalendarDraftChange | null {
  const collision = hasCollision({
    draft,
    sourceEventId: input.event.id,
    events: input.events,
    collisionGroupBy: input.collisionGroupBy
  });
  if (collision && input.collisionPolicy === "reject-overlap") return null;
  return { ...draft, hasCollisionWarning: collision };
}

/**
 * Returns true when a draft overlaps another event in the same collision lane.
 */
export function hasCollision(input: HasCollisionInput): boolean {
  const draftLaneKey = getCollisionLaneKey(input.collisionGroupBy, input.draft);

  for (const event of input.events) {
    if (event.id === input.sourceEventId) continue;
    if (getCollisionLaneKey(input.collisionGroupBy, event) !== draftLaneKey) continue;
    if (intervalsOverlap(input.draft.start, input.draft.end, event.start, event.end)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns true when a candidate event belongs to the draft's collision lane.
 */
function getCollisionLaneKey(
  groupBy: CollisionGroupBy,
  subject: Pick<CalendarDraftChange, "resourceId" | "start"> | CalendarEvent
): string {
  if (groupBy === "resourceId") {
    return subject.resourceId ?? "";
  }
  return calendarDayKey(subject.start);
}

/**
 * Builds a UTC calendar-day key used for week-view collision grouping.
 */
function calendarDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Snaps a minute value to the nearest configured interval.
 */
export function snapMinutes(value: number, intervalMinutes: number): number {
  assertPositiveMinutes("intervalMinutes", intervalMinutes);
  return Math.round(value / intervalMinutes) * intervalMinutes;
}

/**
 * Applies a resize-start delta while enforcing minimum duration.
 */
function applyResizeStart(
  event: CalendarEvent,
  snappedMinuteDelta: number,
  minimumDurationMs: number,
  durationMs: number
): Date | null {
  const requestedStart = event.start.getTime() + snappedMinuteDelta * MINUTES_MS;
  const latestStart = event.end.getTime() - minimumDurationMs;
  if (durationMs < minimumDurationMs && requestedStart > event.start.getTime()) {
    return null;
  }
  return new Date(Math.min(requestedStart, latestStart));
}

/**
 * Applies a resize-end delta while enforcing minimum duration.
 */
function applyResizeEnd(
  event: CalendarEvent,
  snappedMinuteDelta: number,
  minimumDurationMs: number,
  durationMs: number
): Date | null {
  const requestedEnd = event.end.getTime() + snappedMinuteDelta * MINUTES_MS;
  const earliestEnd = event.start.getTime() + minimumDurationMs;
  if (durationMs < minimumDurationMs && requestedEnd < event.end.getTime()) {
    return null;
  }
  return new Date(Math.max(requestedEnd, earliestEnd));
}

/**
 * Checks whether two half-open time intervals overlap.
 */
function intervalsOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

/**
 * Validates positive finite minute values used in interaction math.
 */
function assertPositiveMinutes(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}
