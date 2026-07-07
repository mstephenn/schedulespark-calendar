/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import { getEventLabel } from "../accessibility";
import { getTimedEventStyle, resolveEventColor } from "../core/event-colors";
import { handleEventKeyboardInteraction, startEventPointerInteraction } from "../interactions";

import type { InteractionRegistry } from "../calendar";
import type {
  BusinessHours,
  CalendarDraftChange,
  CalendarEvent,
  CalendarResource,
  CollisionPolicy,
  EventLayout
} from "../types";

export interface EventBlockContext {
  /** Announces a rejected interaction (e.g. via an `aria-live` region) to non-visual users. */
  announce?: (message: string) => void;
  businessHours: BusinessHours;
  collisionPolicy: CollisionPolicy;
  defaultEventColor?: string;
  readonly events: CalendarEvent[];
  interactionRegistry: InteractionRegistry;
  interactive: boolean;
  minimumDurationMinutes: number;
  onDraftChange?: (change: CalendarDraftChange) => void;
  onEventCopy?: (input: { sourceEvent: CalendarEvent; start: Date; end: Date; resourceId?: string }) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  readonly resources: CalendarResource[];
  slotHeightPx: number;
  slotMinutes: number;
  snapMinutes: number;
  usesResourceLanes: boolean;
  readonly visibleDays: Date[];
}

/**
 * Builds a single timed event block for the day/week/work-week grid, wiring pointer
 * drag/resize and keyboard move/resize when `context.interactive` is set.
 */
export function renderEventBlock(layout: EventLayout, context: EventBlockContext): HTMLElement {
  const color = resolveEventColor(layout.event, context.defaultEventColor);
  const columnIndex = context.usesResourceLanes ? layout.resourceIndex ?? 0 : layout.dayIndex;

  const block = document.createElement("div");
  block.className = getEventClassName(color, context.interactive);
  block.setAttribute("role", isOperable(context) ? "button" : "group");
  block.setAttribute("aria-label", getEventLabel(layout.event, context.resources));
  if (context.interactive) block.tabIndex = 0;
  applyEventStyle(block, layout, columnIndex, color);
  block.appendChild(buildEventContent(layout.event));

  if (context.interactive) attachInteractionHandlers(block, layout, context);
  attachSelectHandler(block, layout, context);

  return block;
}

function isOperable(context: EventBlockContext): boolean {
  return context.interactive && (context.onDraftChange !== undefined || context.onEventSelect !== undefined);
}

function attachSelectHandler(block: HTMLElement, layout: EventLayout, context: EventBlockContext): void {
  if (!context.onEventSelect) return;
  block.addEventListener("click", () => {
    context.onEventSelect?.(layout.event);
  });
}

function attachInteractionHandlers(block: HTMLElement, layout: EventLayout, context: EventBlockContext): void {
  block.appendChild(buildResizeHandle("start", block, layout, context));
  block.appendChild(buildResizeHandle("end", block, layout, context));

  block.addEventListener("pointerdown", (event) => {
    startEventPointerInteraction({ block, context, layout }, "move", event);
  });

  block.addEventListener("keydown", (event) => {
    if (isActivationKey(event.key) && context.onEventSelect) {
      event.preventDefault();
      context.onEventSelect(layout.event);
      return;
    }
    handleEventKeyboardInteraction(event, layout, context);
  });
}

function buildResizeHandle(position: "start" | "end", block: HTMLElement, layout: EventLayout, context: EventBlockContext): HTMLElement {
  const handle = document.createElement("div");
  handle.className = `sscal__event-resize sscal__event-resize--${position}`;
  handle.setAttribute("aria-hidden", "true");
  handle.tabIndex = -1;
  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startEventPointerInteraction({ block, context, layout }, `resize-${position}`, event);
  });
  return handle;
}

function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

function getEventClassName(color: string | undefined, interactive: boolean): string {
  const classNames = ["sscal__event"];
  if (!color) classNames.push("sscal__event--uncolored");
  if (interactive) classNames.push("sscal__event--interactive");
  return classNames.join(" ");
}

function applyEventStyle(block: HTMLElement, layout: EventLayout, columnIndex: number, color: string | undefined): void {
  const timedStyle = getTimedEventStyle(color);
  if (timedStyle.backgroundColor) block.style.backgroundColor = timedStyle.backgroundColor;
  block.style.gridColumn = String(columnIndex + 1);
  block.style.height = `${String(layout.heightPercent)}%`;
  block.style.top = `${String(layout.topPercent)}%`;
}

function buildEventContent(event: CalendarEvent): DocumentFragment {
  const [fallbackPrimary, fallbackSecondary] = event.title.split(" - ");
  const primary = event.workerName ?? fallbackPrimary;
  const secondary = event.roleName ?? fallbackSecondary;

  const fragment = document.createDocumentFragment();
  if (shouldRenderHiddenTitle(event)) {
    const hiddenTitle = document.createElement("span");
    hiddenTitle.className = "sr-only";
    hiddenTitle.textContent = event.title;
    fragment.appendChild(hiddenTitle);
  }

  const content = document.createElement("div");
  content.className = "flex flex-col h-full justify-between p-1 select-none overflow-hidden text-xs";

  const primaryGroup = document.createElement("div");
  primaryGroup.className = "flex flex-col min-w-0";

  const primaryLabel = document.createElement("span");
  primaryLabel.className = "font-bold text-white truncate leading-snug";
  primaryLabel.textContent = primary;
  primaryGroup.appendChild(primaryLabel);

  if (secondary) {
    const secondaryLabel = document.createElement("span");
    secondaryLabel.className = "text-[10px] text-white/80 truncate mt-0.5 leading-none";
    secondaryLabel.textContent = secondary;
    primaryGroup.appendChild(secondaryLabel);
  }

  content.appendChild(primaryGroup);

  if (event.status) content.appendChild(buildStatusPill(event.status));

  fragment.appendChild(content);
  return fragment;
}

function buildStatusPill(status: string): HTMLElement {
  const pill = document.createElement("span");
  pill.className = `self-start mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none shadow-sm ${getStatusClassName(status)}`;
  pill.textContent = status;
  return pill;
}

function getStatusClassName(status: string): string {
  if (status === "PENDING") return "bg-amber-100/90 text-amber-800";
  if (status === "NOTIFIED") return "bg-blue-100/90 text-blue-800";
  return "bg-emerald-100/90 text-emerald-800";
}

function shouldRenderHiddenTitle(event: CalendarEvent): boolean {
  return event.workerName !== undefined || event.roleName !== undefined || event.status !== undefined || event.title.includes(" - ");
}
