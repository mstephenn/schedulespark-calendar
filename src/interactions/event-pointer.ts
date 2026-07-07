/* eslint-disable jsdoc/require-jsdoc -- Private interaction wiring stays documented at the exported-function level only. */
import { buildInteractionPreviewFromPointer } from "../core/interaction-preview";
import { buildInteractionDraft } from "../core/interactions";

import { capturePointer, getInteractionDelta, measureColumnWidth, releasePointer } from "./pointer-math";

import type { InteractionRegistry } from "../calendar";
import type { InteractionPreviewLayout } from "../core/interaction-preview";
import type {
  BusinessHours,
  CalendarDraftChange,
  CalendarEvent,
  CalendarInteractionKind,
  CalendarResource,
  CollisionPolicy,
  EventLayout
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EventPointerInteractionContext {
  businessHours: BusinessHours;
  collisionPolicy: CollisionPolicy;
  readonly events: CalendarEvent[];
  interactionRegistry: InteractionRegistry;
  minimumDurationMinutes: number;
  onDraftChange?: (change: CalendarDraftChange) => void;
  onEventCopy?: (input: { sourceEvent: CalendarEvent; start: Date; end: Date; resourceId?: string }) => void;
  readonly resources: CalendarResource[];
  slotHeightPx: number;
  slotMinutes: number;
  snapMinutes: number;
  usesResourceLanes: boolean;
  readonly visibleDays: Date[];
}

interface PointerInteractionStart {
  clientX: number;
  clientY: number;
  columnWidthPx: number;
  kind: CalendarInteractionKind;
  pointerId: number;
  slotHeightPx: number;
}

export interface EventPointerInteractionTarget {
  block: HTMLElement;
  context: EventPointerInteractionContext;
  layout: EventLayout;
}

/**
 * Starts a pointer-driven move/resize on an event block. The block's own inline style
 * is mutated directly for live preview feedback — no full-tree rebuild during a drag.
 */
export function startEventPointerInteraction(target: EventPointerInteractionTarget, kind: CalendarInteractionKind, event: PointerEvent): void {
  const { block, context, layout } = target;
  event.preventDefault();
  context.interactionRegistry.clearActive();

  const isCopy = kind === "move" && (event.ctrlKey || event.metaKey) && context.onEventCopy !== undefined;

  capturePointer(block, event.pointerId);
  const start: PointerInteractionStart = {
    clientX: event.clientX,
    clientY: event.clientY,
    columnWidthPx: measureColumnWidth(block),
    kind,
    pointerId: event.pointerId,
    slotHeightPx: context.slotHeightPx
  };

  const ghost = isCopy ? buildCopyGhost(block) : null;
  if (ghost) block.parentElement?.appendChild(ghost);
  else block.classList.add("sscal__event--dragging");

  const cleanup = attachWindowListeners({ block, context, ghost, layout }, start);
  context.interactionRegistry.setActive(cleanup);
}

function buildCopyGhost(block: HTMLElement): HTMLElement {
  const ghost = block.cloneNode(true) as HTMLElement;
  ghost.classList.add("sscal__event--ghost");
  ghost.classList.remove("sscal__event--dragging", "sscal__event--collision");
  for (const handle of [...ghost.querySelectorAll(".sscal__event-resize")]) handle.remove();
  ghost.setAttribute("aria-hidden", "true");
  return ghost;
}

interface WindowListenerTarget {
  block: HTMLElement;
  context: EventPointerInteractionContext;
  ghost: HTMLElement | null;
  layout: EventLayout;
}

function attachWindowListeners(target: WindowListenerTarget, start: PointerInteractionStart): () => void {
  const { block, context, ghost, layout } = target;
  let active = true;
  const styleTarget = ghost ?? block;

  function clear(): void {
    if (!active) return;
    active = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    ghost?.remove();
  }

  function onPointerMove(pointerEvent: PointerEvent): void {
    if (pointerEvent.pointerId !== start.pointerId) return;
    const preview = buildInteractionPreviewFromPointer(
      { clientX: start.clientX, clientY: start.clientY, columnWidthPx: start.columnWidthPx, kind: start.kind, layout, slotHeightPx: start.slotHeightPx },
      { clientX: pointerEvent.clientX, clientY: pointerEvent.clientY },
      {
        businessHours: context.businessHours,
        collisionGroupBy: context.usesResourceLanes ? "resourceId" : "day",
        collisionPolicy: context.collisionPolicy,
        events: context.events,
        minimumDurationMinutes: context.minimumDurationMinutes,
        resources: context.resources,
        slotMinutes: context.slotMinutes,
        snapMinutes: context.snapMinutes,
        usesResourceLanes: context.usesResourceLanes,
        visibleDays: context.visibleDays
      }
    );
    applyPreviewStyle(styleTarget, layout, preview, context.usesResourceLanes);
  }

  function onPointerUp(pointerEvent: PointerEvent): void {
    if (pointerEvent.pointerId !== start.pointerId) return;
    releasePointer(block, pointerEvent.pointerId);
    block.classList.remove("sscal__event--dragging", "sscal__event--collision");

    if (ghost) {
      const copyResult = buildCopyResult(start, layout, { clientX: pointerEvent.clientX, clientY: pointerEvent.clientY }, context);
      clear();
      context.interactionRegistry.setActive(null);
      context.onEventCopy?.({ sourceEvent: layout.event, ...copyResult });
      return;
    }

    const draft = buildDraftFromPointer(start, layout, { clientX: pointerEvent.clientX, clientY: pointerEvent.clientY }, context);
    clear();
    context.interactionRegistry.setActive(null);
    if (draft) context.onDraftChange?.(draft);
  }

  function onPointerCancel(pointerEvent: PointerEvent): void {
    if (pointerEvent.pointerId !== start.pointerId) return;
    releasePointer(block, pointerEvent.pointerId);
    block.classList.remove("sscal__event--dragging", "sscal__event--collision");
    clear();
    context.interactionRegistry.setActive(null);
  }

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);

  return clear;
}

function buildCopyResult(
  start: PointerInteractionStart,
  layout: EventLayout,
  end: { clientX: number; clientY: number },
  context: EventPointerInteractionContext
): { start: Date; end: Date; resourceId?: string } {
  const delta = getInteractionDelta(start, end, context.slotMinutes);
  const durationMs = layout.event.end.getTime() - layout.event.start.getTime();
  const deltaMs = delta.minuteDelta * 60_000 + (context.usesResourceLanes ? 0 : delta.dayDelta * DAY_MS);
  const newStart = new Date(layout.event.start.getTime() + deltaMs);
  const columnIndex = context.usesResourceLanes ? layout.resourceIndex ?? 0 : layout.dayIndex;
  const resourceId = context.usesResourceLanes
    ? context.resources[Math.max(0, Math.min(context.resources.length - 1, columnIndex + delta.dayDelta))]?.id
    : layout.event.resourceId;
  return { start: newStart, end: new Date(newStart.getTime() + durationMs), resourceId };
}

function applyPreviewStyle(
  block: HTMLElement,
  layout: EventLayout,
  preview: InteractionPreviewLayout | null,
  usesResourceLanes: boolean
): void {
  block.classList.toggle("sscal__event--collision", preview?.hasCollisionWarning ?? false);
  const active = preview ?? layout;
  const columnIndex = usesResourceLanes ? active.resourceIndex ?? 0 : active.dayIndex;
  block.style.gridColumn = String(columnIndex + 1);
  block.style.top = `${String(active.topPercent)}%`;
  block.style.height = `${String(active.heightPercent)}%`;
}

function buildDraftFromPointer(
  start: PointerInteractionStart,
  layout: EventLayout,
  end: { clientX: number; clientY: number },
  context: EventPointerInteractionContext
): CalendarDraftChange | null {
  const columnIndex = context.usesResourceLanes ? layout.resourceIndex ?? 0 : layout.dayIndex;
  const delta = getInteractionDelta(start, end, context.slotMinutes);
  const nextResource =
    context.usesResourceLanes && start.kind === "move"
      ? context.resources[Math.max(0, Math.min(context.resources.length - 1, columnIndex + delta.dayDelta))]?.id
      : layout.event.resourceId;

  return buildInteractionDraft({
    event: layout.event,
    kind: start.kind,
    minuteDelta: delta.minuteDelta,
    dayDelta: context.usesResourceLanes ? 0 : delta.dayDelta,
    snapMinutes: context.snapMinutes,
    minimumDurationMinutes: context.minimumDurationMinutes,
    resourceId: nextResource,
    events: context.events,
    collisionPolicy: context.collisionPolicy,
    collisionGroupBy: context.usesResourceLanes ? "resourceId" : "day"
  });
}
