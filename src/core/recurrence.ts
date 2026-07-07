import { expandRRuleOccurrences, parseRRule } from "@schedulespark/rrule";

import type { CalendarEvent } from "../types";
import type { ParsedRRule } from "@schedulespark/rrule";

export interface ExpandRecurrenceInput {
  events: CalendarEvent[];
  rangeStart: Date;
  rangeEnd: Date;
  timeZone?: string;
}

const recurrenceRuleCache = new WeakMap<CalendarEvent, { rule: string; parsed: ParsedRRule }>();

/**
 * Expands recurring master events into occurrence instances inside the requested range.
 */
export function expandRecurrenceEvents(input: ExpandRecurrenceInput): CalendarEvent[] {
  return input.events.flatMap((event) => expandEvent(event, input.rangeStart, input.rangeEnd, input.timeZone));
}

/**
 * Returns one event unchanged or expands a recurring master into range-bound occurrences.
 */
function expandEvent(event: CalendarEvent, rangeStart: Date, rangeEnd: Date, timeZone = "UTC"): CalendarEvent[] {
  if (!event.recurrenceRule) return [event];

  try {
    const durationMs = event.end.getTime() - event.start.getTime();
    const rule = parseRecurrenceRule(event);

    const occurrenceStarts = expandRRuleOccurrences(event.start, rule, rangeStart, { rangeEnd, timeZone });

    return occurrenceStarts.map((occurrenceStart) => ({
      id: `${event.id}:${occurrenceStart.toISOString()}`,
      recurrenceId: event.id,
      title: event.title,
      start: occurrenceStart,
      end: new Date(occurrenceStart.getTime() + durationMs),
      resourceId: event.resourceId,
      color: event.color,
      allDay: event.allDay
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Skipping recurring event "${event.id}": ${message}`);
    return [];
  }
}

/**
 * Parses a calendar event recurrence rule.
 */
function parseRecurrenceRule(event: CalendarEvent): ParsedRRule {
  const recurrenceRule = event.recurrenceRule;
  if (!recurrenceRule) {
    throw new Error(`Missing recurrence rule for event "${event.id}"`);
  }

  const cached = recurrenceRuleCache.get(event);
  if (cached?.rule === recurrenceRule) return cached.parsed;

  try {
    const parsed = parseRRule(recurrenceRule);
    recurrenceRuleCache.set(event, { rule: recurrenceRule, parsed });
    return parsed;
  } catch {
    throw new Error(`Invalid recurrence rule for event "${event.id}": ${recurrenceRule}`);
  }
}
