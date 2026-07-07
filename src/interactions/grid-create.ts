/* eslint-disable jsdoc/require-jsdoc -- Private interaction wiring stays documented at the exported-function level only. */
import { resolveDayBounds } from "../core/day-bounds";

import { capturePointer, releasePointer } from "./pointer-math";

import type { InteractionRegistry } from "../calendar";
import type { BusinessHours } from "../types";

export interface GridCreateContext {
  businessHours: BusinessHours;
  interactionRegistry: InteractionRegistry;
  minimumDurationMinutes: number;
  onEventCreate?: (input: { start: Date; end: Date; resourceId?: string }) => void;
  slotHeightPx: number;
  slotMinutes: number;
  snapMinutes: number;
}

/** Identifies the empty grid cell a create-drag started on. */
export interface GridCreateTarget {
  cell: HTMLElement;
  columnIndex: number;
  context: GridCreateContext;
  day: Date;
  daysRow: HTMLElement;
  resourceId?: string;
}

interface GridCreateStart {
  clientY: number;
  columnTop: number;
  day: Date;
  pointerId: number;
  resourceId?: string;
}

/**
 * Starts a pointer-driven drag-to-create on an empty grid cell. A plain click (pointerdown
 * immediately followed by pointerup with no movement) creates a default-duration event at
 * the clicked slot; a drag creates an event spanning the dragged range.
 */
export function startGridCreateInteraction(target: GridCreateTarget, event: PointerEvent): void {
  const { cell, columnIndex, context, day, daysRow, resourceId } = target;
  if (!context.onEventCreate) return;
  event.preventDefault();
  context.interactionRegistry.clearActive();

  capturePointer(cell, event.pointerId);
  const start: GridCreateStart = {
    clientY: event.clientY,
    columnTop: cell.getBoundingClientRect().top,
    day,
    pointerId: event.pointerId,
    resourceId
  };

  const ghost = buildGhost(columnIndex);
  daysRow.appendChild(ghost);
  updateGhost(ghost, start, event.clientY, context);

  const cleanup = attachWindowListeners(cell, ghost, start, context);
  context.interactionRegistry.setActive(cleanup);
}

function attachWindowListeners(cell: HTMLElement, ghost: HTMLElement, start: GridCreateStart, context: GridCreateContext): () => void {
  let active = true;

  function clear(): void {
    if (!active) return;
    active = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    ghost.remove();
  }

  function onPointerMove(pointerEvent: PointerEvent): void {
    if (pointerEvent.pointerId !== start.pointerId) return;
    updateGhost(ghost, start, pointerEvent.clientY, context);
  }

  function onPointerUp(pointerEvent: PointerEvent): void {
    if (pointerEvent.pointerId !== start.pointerId) return;
    releasePointer(cell, pointerEvent.pointerId);
    const range = resolveRange(start, pointerEvent.clientY, context);
    clear();
    context.interactionRegistry.setActive(null);
    context.onEventCreate?.({ start: range.start, end: range.end, resourceId: start.resourceId });
  }

  function onPointerCancel(pointerEvent: PointerEvent): void {
    if (pointerEvent.pointerId !== start.pointerId) return;
    releasePointer(cell, pointerEvent.pointerId);
    clear();
    context.interactionRegistry.setActive(null);
  }

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);

  return clear;
}

function updateGhost(ghost: HTMLElement, start: GridCreateStart, currentClientY: number, context: GridCreateContext): void {
  const range = resolveRange(start, currentClientY, context);
  const bounds = resolveDayBounds(start.day, context.businessHours);
  const totalMinutes = minutesBetween(bounds.start, bounds.end);
  ghost.style.top = `${String((minutesBetween(bounds.start, range.start) / totalMinutes) * 100)}%`;
  ghost.style.height = `${String((minutesBetween(range.start, range.end) / totalMinutes) * 100)}%`;
}

function resolveRange(start: GridCreateStart, currentClientY: number, context: GridCreateContext): { start: Date; end: Date } {
  const bounds = resolveDayBounds(start.day, context.businessHours);
  const anchorMinutes = snapMinutesFromOffset(start.clientY - start.columnTop, context);
  const currentMinutes = snapMinutesFromOffset(currentClientY - start.columnTop, context);
  const minMinutes = Math.min(anchorMinutes, currentMinutes);
  const maxMinutes = Math.max(anchorMinutes, currentMinutes, minMinutes + context.minimumDurationMinutes);
  return {
    start: new Date(bounds.start.getTime() + minMinutes * 60_000),
    end: new Date(bounds.start.getTime() + maxMinutes * 60_000)
  };
}

function snapMinutesFromOffset(offsetPx: number, context: GridCreateContext): number {
  const rawMinutes = (offsetPx / context.slotHeightPx) * context.slotMinutes;
  return Math.max(0, Math.round(rawMinutes / context.snapMinutes) * context.snapMinutes);
}

function buildGhost(columnIndex: number): HTMLElement {
  const ghost = document.createElement("div");
  ghost.className = "sscal__event sscal__event--ghost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.gridColumn = String(columnIndex + 1);
  return ghost;
}

function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60_000;
}
