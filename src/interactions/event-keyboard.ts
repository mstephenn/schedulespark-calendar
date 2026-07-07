/* eslint-disable jsdoc/require-jsdoc -- Private interaction wiring stays documented at the exported-function level only. */
import { buildInteractionDraft } from "../core/interactions";

import type {
  CalendarDraftChange,
  CalendarEvent,
  CalendarInteractionKind,
  CalendarResource,
  CollisionPolicy,
  EventLayout
} from "../types";

export interface EventKeyboardInteractionContext {
  /** Announces a rejected interaction (e.g. via an `aria-live` region) to non-visual users. */
  announce?: (message: string) => void;
  collisionPolicy: CollisionPolicy;
  readonly events: CalendarEvent[];
  minimumDurationMinutes: number;
  onDraftChange?: (change: CalendarDraftChange) => void;
  readonly resources: CalendarResource[];
  snapMinutes: number;
  usesResourceLanes: boolean;
}

interface KeyboardDraftInput {
  dayDelta?: number;
  kind: CalendarInteractionKind;
  minuteDelta: number;
  resourceId?: string;
}

/**
 * Handles a keydown on a focused, interactive event block: arrow keys move or resize it.
 */
export function handleEventKeyboardInteraction(event: KeyboardEvent, layout: EventLayout, context: EventKeyboardInteractionContext): void {
  if (!context.onDraftChange) return;

  const draftInput = getKeyboardDraftInput(event, context, layout);
  if (!draftInput) return;

  event.preventDefault();
  const draft = buildInteractionDraft({
    event: layout.event,
    kind: draftInput.kind,
    minuteDelta: draftInput.minuteDelta,
    dayDelta: draftInput.dayDelta,
    snapMinutes: context.snapMinutes,
    minimumDurationMinutes: context.minimumDurationMinutes,
    resourceId: draftInput.resourceId,
    events: context.events,
    collisionPolicy: context.collisionPolicy,
    collisionGroupBy: context.usesResourceLanes ? "resourceId" : "day"
  });
  if (draft) {
    context.onDraftChange(draft);
    return;
  }
  context.announce?.("Can't make that change — it would overlap another event or violate the minimum duration.");
}

function getKeyboardDraftInput(event: KeyboardEvent, context: EventKeyboardInteractionContext, layout: EventLayout): KeyboardDraftInput | null {
  const vertical = getVerticalKeyboardDraftInput(event, context.snapMinutes, layout.event);
  if (vertical) return vertical;
  return getHorizontalKeyboardDraftInput(event, context, layout);
}

function getVerticalKeyboardDraftInput(event: KeyboardEvent, snapMinutes: number, sourceEvent: CalendarEvent): KeyboardDraftInput | null {
  if (event.key === "ArrowUp") return getMinuteKeyboardDraftInput(event, sourceEvent, -snapMinutes);
  if (event.key === "ArrowDown") return getMinuteKeyboardDraftInput(event, sourceEvent, snapMinutes);
  return null;
}

function getHorizontalKeyboardDraftInput(event: KeyboardEvent, context: EventKeyboardInteractionContext, layout: EventLayout): KeyboardDraftInput | null {
  const horizontalDelta = getHorizontalDelta(event.key);
  if (horizontalDelta === null) return null;
  if (context.usesResourceLanes) {
    return getResourceKeyboardDraftInput(context.resources, layout, horizontalDelta);
  }
  return {
    dayDelta: horizontalDelta,
    kind: "move",
    minuteDelta: 0,
    resourceId: layout.event.resourceId
  };
}

function getMinuteKeyboardDraftInput(event: KeyboardEvent, sourceEvent: CalendarEvent, minuteDelta: number): KeyboardDraftInput {
  return {
    kind: getVerticalInteractionKind(event),
    minuteDelta,
    resourceId: sourceEvent.resourceId
  };
}

function getVerticalInteractionKind(event: KeyboardEvent): CalendarInteractionKind {
  if (event.shiftKey) return "resize-start";
  if (event.altKey) return "resize-end";
  return "move";
}

function getHorizontalDelta(key: string): number | null {
  if (key === "ArrowLeft") return -1;
  if (key === "ArrowRight") return 1;
  return null;
}

function getResourceKeyboardDraftInput(resources: CalendarResource[], layout: EventLayout, horizontalDelta: number): KeyboardDraftInput {
  return {
    kind: "move",
    minuteDelta: 0,
    resourceId: getResourceIdForDelta(resources, layout.resourceIndex ?? 0, horizontalDelta) ?? layout.event.resourceId
  };
}

function getResourceIdForDelta(resources: CalendarResource[], currentIndex: number, delta: number): string | undefined {
  if (resources.length === 0) return undefined;
  const nextIndex = Math.max(0, Math.min(resources.length - 1, currentIndex + delta));
  return resources[nextIndex]?.id;
}
