/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import { SUGGESTED_EVENT_COLORS } from "../core/event-colors";

import type { CalendarEvent } from "../types";

const COLOR_PICKER_FALLBACK = "#6264a7";

/**
 * Builds per-event color pickers and suggested swatches for the playground.
 */
export function buildEventColorPanel(events: CalendarEvent[], onColorChange: (eventId: string, color: string | undefined) => void): HTMLElement {
  const section = document.createElement("section");
  section.className = "playground__colors";

  const heading = document.createElement("h2");
  heading.textContent = "Event colors";

  const help = document.createElement("p");
  help.className = "playground__colors-help";
  help.textContent = "Colors are configured by the host app. The calendar never assigns them automatically.";

  const list = document.createElement("div");
  list.className = "playground__color-list";
  for (const event of events) {
    list.appendChild(buildEventColorRow(event, onColorChange));
  }

  section.append(heading, help, list);
  return section;
}

function buildEventColorRow(event: CalendarEvent, onColorChange: (eventId: string, color: string | undefined) => void): HTMLElement {
  const row = document.createElement("div");
  row.className = "playground__color-row";

  const title = document.createElement("div");
  title.className = "playground__color-row-title";
  title.textContent = event.title;

  const pickerLabel = document.createElement("label");
  pickerLabel.className = "playground__color-picker";

  const srLabel = document.createElement("span");
  srLabel.className = "sr-only";
  srLabel.textContent = `Pick a color for ${event.title}`;

  const picker = document.createElement("input");
  picker.type = "color";
  picker.value = event.color ?? COLOR_PICKER_FALLBACK;
  picker.addEventListener("change", () => {
    onColorChange(event.id, picker.value);
  });

  pickerLabel.append(srLabel, picker);

  const swatches = document.createElement("div");
  swatches.className = "playground__swatches";
  for (const color of SUGGESTED_EVENT_COLORS) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = `playground__swatch${event.color === color ? " playground__swatch--active" : ""}`;
    swatch.style.backgroundColor = color;
    swatch.setAttribute("aria-label", `Set ${event.title} to ${color}`);
    swatch.addEventListener("click", () => {
      onColorChange(event.id, color);
    });
    swatches.appendChild(swatch);
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "playground__color-clear";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => {
    onColorChange(event.id, undefined);
  });

  row.append(title, pickerLabel, swatches, clearButton);
  return row;
}
