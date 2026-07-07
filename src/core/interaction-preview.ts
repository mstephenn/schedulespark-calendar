import { resolveDayBounds } from "./day-bounds";
import { buildInteractionDraft } from "./interactions";
import { isSameUtcDay } from "./time-grid";

import type {
  BusinessHours,
  CalendarEvent,
  CalendarInteractionKind,
  CalendarResource,
  CollisionPolicy,
  EventLayout
} from "../types";

interface BuildInteractionPreviewInput {
  businessHours: BusinessHours;
  collisionGroupBy: "resourceId" | "day";
  collisionPolicy: CollisionPolicy;
  dayDelta?: number;
  event: CalendarEvent;
  events: CalendarEvent[];
  kind: CalendarInteractionKind;
  minimumDurationMinutes: number;
  minuteDelta: number;
  resourceId?: string;
  resources: CalendarResource[];
  snapMinutes: number;
  usesResourceLanes: boolean;
  visibleDays: Date[];
}

/** Live grid coordinates shown while dragging or resizing an event. */
export interface InteractionPreviewLayout {
  dayIndex: number;
  hasCollisionWarning: boolean;
  heightPercent: number;
  resourceIndex?: number;
  topPercent: number;
}

/**
 * Builds snapped preview coordinates for an in-progress pointer interaction.
 */
export function buildInteractionPreview(input: BuildInteractionPreviewInput): InteractionPreviewLayout | null {
  const draft = buildInteractionDraft({
    event: input.event,
    kind: input.kind,
    minuteDelta: input.minuteDelta,
    dayDelta: input.dayDelta,
    snapMinutes: input.snapMinutes,
    minimumDurationMinutes: input.minimumDurationMinutes,
    resourceId: input.resourceId,
    events: input.events,
    collisionPolicy: input.collisionPolicy,
    collisionGroupBy: input.collisionGroupBy
  });
  if (!draft) return null;

  const dayIndex = input.visibleDays.findIndex((day) => isSameUtcDay(day, draft.start));
  if (dayIndex < 0) return null;

  const visibleDay = input.visibleDays.at(dayIndex);
  if (visibleDay === undefined) return null;

  const percents = computeLayoutPercents(draft.start, draft.end, visibleDay, input.businessHours);
  if (!percents) return null;

  if (input.usesResourceLanes) {
    const resourceIndex = input.resources.findIndex((resource) => resource.id === draft.resourceId);
    if (resourceIndex < 0) return null;
    return {
      dayIndex: 0,
      hasCollisionWarning: draft.hasCollisionWarning,
      heightPercent: percents.heightPercent,
      resourceIndex,
      topPercent: percents.topPercent
    };
  }

  return {
    dayIndex,
    hasCollisionWarning: draft.hasCollisionWarning,
    heightPercent: percents.heightPercent,
    topPercent: percents.topPercent
  };
}

/**
 * Maps a pointer interaction start and current position to preview layout coordinates.
 */
export function buildInteractionPreviewFromPointer(
  start: {
    clientX: number;
    clientY: number;
    columnWidthPx: number;
    kind: CalendarInteractionKind;
    layout: EventLayout;
    slotHeightPx: number;
  },
  end: { clientX: number; clientY: number },
  input: Omit<BuildInteractionPreviewInput, "event" | "kind" | "minuteDelta" | "dayDelta" | "resourceId"> & {
    slotMinutes: number;
  }
): InteractionPreviewLayout | null {
  const columnIndex = input.usesResourceLanes ? start.layout.resourceIndex ?? 0 : start.layout.dayIndex;
  const dayDelta = Math.round((end.clientX - start.clientX) / start.columnWidthPx);
  const minuteDelta = Math.round((end.clientY - start.clientY) / start.slotHeightPx) * input.slotMinutes;
  const nextResource = input.usesResourceLanes && start.kind === "move"
    ? input.resources[Math.max(0, Math.min(input.resources.length - 1, columnIndex + dayDelta))]?.id
    : start.layout.event.resourceId;

  return buildInteractionPreview({
    ...input,
    dayDelta: input.usesResourceLanes ? 0 : dayDelta,
    event: start.layout.event,
    kind: start.kind,
    minuteDelta,
    resourceId: nextResource
  });
}

/**
 * Computes percentage positions for preview start/end within one visible day.
 */
function computeLayoutPercents(
  start: Date,
  end: Date,
  day: Date,
  businessHours: BusinessHours
): { topPercent: number; heightPercent: number } | null {
  const { start: dayStart, end: dayEnd } = resolveDayBounds(day, businessHours);
  if (!intervalsOverlap(start, end, dayStart, dayEnd)) return null;

  const clippedStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
  const clippedEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
  if (clippedEnd <= clippedStart) return null;

  const totalMinutes = minutesBetween(dayStart, dayEnd);
  return {
    topPercent: (minutesBetween(dayStart, clippedStart) / totalMinutes) * 100,
    heightPercent: (minutesBetween(clippedStart, clippedEnd) / totalMinutes) * 100
  };
}

/**
 * Returns the number of minutes between two instants.
 */
function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60_000;
}

/**
 * Returns whether two half-open intervals overlap.
 */
function intervalsOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}
