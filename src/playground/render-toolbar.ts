/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import type { CalendarView } from "../types";

export interface PlaygroundToolbarState {
  compact: boolean;
  date: string;
  defaultEventColor?: string;
  interactive: boolean;
  showResources: boolean;
  slotMinutes: number;
  view: CalendarView;
  weekStartsOn: number;
}

export interface PlaygroundToolbarHandlers {
  onCompactChange: (compact: boolean) => void;
  onDateChange: (date: string) => void;
  onDefaultEventColorChange: (color: string | undefined) => void;
  onInteractiveChange: (interactive: boolean) => void;
  onShowResourcesChange: (showResources: boolean) => void;
  onSlotMinutesChange: (slotMinutes: number) => void;
  onViewChange: (view: CalendarView) => void;
  onWeekStartsOnChange: (weekStartsOn: number) => void;
}

/**
 * Builds the playground toolbar controls for calendar options and interaction modes.
 */
export function buildPlaygroundToolbar(state: PlaygroundToolbarState, handlers: PlaygroundToolbarHandlers): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = "playground__toolbar";
  toolbar.append(
    buildViewField(state.view, handlers.onViewChange),
    buildDateField(state.date, handlers.onDateChange),
    buildSlotMinutesField(state.slotMinutes, handlers.onSlotMinutesChange),
    buildWeekStartField(state.weekStartsOn, handlers.onWeekStartsOnChange),
    buildDefaultEventColorField(state.defaultEventColor, handlers.onDefaultEventColorChange),
    buildCheckboxField({ checked: state.compact, id: "compact", label: "Compact density", onChange: handlers.onCompactChange }),
    buildCheckboxField({ checked: state.interactive, id: "interactive", label: "Interactive", onChange: handlers.onInteractiveChange }),
    buildCheckboxField({
      checked: state.showResources,
      disabled: state.view !== "day",
      id: "resources",
      label: "Resource lanes (day view)",
      onChange: handlers.onShowResourcesChange
    })
  );
  return toolbar;
}

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "workweek", label: "Work Week" },
  { id: "month", label: "Month" }
];

function buildViewField(value: CalendarView, onChange: (view: CalendarView) => void): HTMLElement {
  const field = document.createElement("div");
  field.className = "playground__field";

  const label = document.createElement("label");
  label.textContent = "View";
  field.appendChild(label);

  const group = document.createElement("div");
  group.className = "playground__view-group";
  group.setAttribute("role", "group");

  for (const option of VIEW_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.className = getViewButtonClassName(option.id === value);
    button.addEventListener("click", () => {
      onChange(option.id);
    });
    group.appendChild(button);
  }

  field.appendChild(group);
  return field;
}

function getViewButtonClassName(isActive: boolean): string {
  return isActive ? "playground__view-button playground__view-button--active" : "playground__view-button";
}

function buildDateField(value: string, onChange: (date: string) => void): HTMLElement {
  const field = document.createElement("div");
  field.className = "playground__field";

  const label = document.createElement("label");
  label.htmlFor = "date";
  label.textContent = "Anchor date (UTC)";

  const input = document.createElement("input");
  input.id = "date";
  input.type = "date";
  input.value = value;
  input.addEventListener("change", () => {
    onChange(input.value);
  });

  field.append(label, input);
  return field;
}

function buildSlotMinutesField(value: number, onChange: (slotMinutes: number) => void): HTMLElement {
  const field = document.createElement("div");
  field.className = "playground__field";

  const label = document.createElement("label");
  label.htmlFor = "slot-minutes";
  label.textContent = "Slot minutes";

  const select = document.createElement("select");
  select.id = "slot-minutes";
  for (const minutes of [15, 30, 60]) {
    const option = document.createElement("option");
    option.value = String(minutes);
    option.textContent = String(minutes);
    if (minutes === value) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    onChange(Number(select.value));
  });

  field.append(label, select);
  return field;
}

function buildWeekStartField(value: number, onChange: (weekStartsOn: number) => void): HTMLElement {
  const field = document.createElement("div");
  field.className = "playground__field";

  const label = document.createElement("label");
  label.htmlFor = "week-start";
  label.textContent = "Week starts on";

  const select = document.createElement("select");
  select.id = "week-start";
  for (const { day, name } of [
    { day: 0, name: "Sunday" },
    { day: 1, name: "Monday" }
  ]) {
    const option = document.createElement("option");
    option.value = String(day);
    option.textContent = name;
    if (day === value) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    onChange(Number(select.value));
  });

  field.append(label, select);
  return field;
}

function buildDefaultEventColorField(value: string | undefined, onChange: (color: string | undefined) => void): HTMLElement {
  const field = document.createElement("div");
  field.className = "playground__field";

  const label = document.createElement("label");
  label.htmlFor = "default-event-color";
  label.textContent = "Default event color";

  const row = document.createElement("div");
  row.className = "playground__default-color";

  const input = document.createElement("input");
  input.id = "default-event-color";
  input.type = "color";
  input.value = value ?? "#6264a7";
  input.addEventListener("change", () => {
    onChange(input.value);
  });

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "playground__color-clear";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => {
    onChange(undefined);
  });

  row.append(input, clearButton);
  field.append(label, row);
  return field;
}

function buildCheckboxField(options: {
  checked: boolean;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}): HTMLElement {
  const field = document.createElement("div");
  field.className = "playground__field playground__field--checkbox";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = options.id;
  input.checked = options.checked;
  input.disabled = options.disabled ?? false;
  input.addEventListener("change", () => {
    options.onChange(input.checked);
  });

  const label = document.createElement("label");
  label.htmlFor = options.id;
  label.textContent = options.label;

  field.append(input, label);
  return field;
}
