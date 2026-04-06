import {
  addDays,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import { RRule, rrulestr, type Options } from "rrule";

import type {
  EventOccurrence,
  EventOverride,
  EventRecord,
  EventRecurrenceRule,
} from "@/lib/types";
import {
  getDurationMinutes,
  getTimelineHeight,
  getTimelineOffset,
} from "@/lib/date";

export function normalizeRRuleString(rule: string) {
  return rule.replace(/^RRULE:/i, "").trim();
}

function buildRule(event: EventRecord, rule: EventRecurrenceRule) {
  return rrulestr(
    `DTSTART:${format(parseISO(event.start_at), "yyyyMMdd'T'HHmmss'Z'")}\nRRULE:${normalizeRRuleString(rule.rrule)}`,
  );
}

function getOccurrenceDateString(date: Date) {
  return format(startOfDay(date), "yyyy-MM-dd");
}

export function buildRecurrenceString(input: {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byWeekday: number[];
  until: string | null;
}) {
  const options: Partial<Options> = {
    freq: RRule[input.frequency],
    interval: input.interval,
  };

  if (input.byWeekday.length > 0) {
    options.byweekday = input.byWeekday;
  }

  if (input.until) {
    options.until = parseISO(input.until);
  }

  return normalizeRRuleString(RRule.optionsToString(options as Options));
}

export function expandEventOccurrences(params: {
  events: EventRecord[];
  rules: EventRecurrenceRule[];
  overrides: EventOverride[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { events, rules, overrides, rangeStart, rangeEnd } = params;
  const ruleByEventId = new Map(rules.map((rule) => [rule.event_id, rule]));
  const overridesByKey = new Map(
    overrides.map((override) => [
      `${override.event_id}:${override.occurrence_date}`,
      override,
    ]),
  );
  const occurrences: EventOccurrence[] = [];

  for (const event of events) {
    const eventStart = parseISO(event.start_at);
    const eventEnd = parseISO(event.end_at);
    const durationMinutes = getDurationMinutes(event.start_at, event.end_at);
    const recurrenceRule = ruleByEventId.get(event.id);

    if (!recurrenceRule) {
      if (isBefore(eventEnd, rangeStart) || isAfter(eventStart, rangeEnd)) {
        continue;
      }

      occurrences.push({
        id: `${event.id}:${getOccurrenceDateString(eventStart)}`,
        event_id: event.id,
        occurrence_date: getOccurrenceDateString(eventStart),
        title: event.title,
        description: event.description,
        location: event.location,
        category_id: event.category_id,
        start_at: event.start_at,
        end_at: event.end_at,
        timezone: event.timezone,
        color: event.color,
        reminder_offsets: event.reminder_offsets,
        is_recurring_instance: false,
        layout: { column: 0, columns: 1 },
      });
      continue;
    }

    const occurrenceDates = buildRule(event, recurrenceRule).between(
      rangeStart,
      rangeEnd,
      true,
    );

    for (const occurrenceDate of occurrenceDates) {
      const dayKey = getOccurrenceDateString(occurrenceDate);
      const override = overridesByKey.get(`${event.id}:${dayKey}`);

      if (override?.is_cancelled) {
        continue;
      }

      const shiftedStart = addDays(
        eventStart,
        differenceInCalendarDays(occurrenceDate, startOfDay(eventStart)),
      );
      const computedStart = override?.start_at ?? shiftedStart.toISOString();
      const computedEnd =
        override?.end_at ??
        new Date(
          parseISO(computedStart).getTime() + durationMinutes * 60_000,
        ).toISOString();

      occurrences.push({
        id: `${event.id}:${dayKey}`,
        event_id: event.id,
        occurrence_date: dayKey,
        title: override?.title ?? event.title,
        description: override?.description ?? event.description,
        location: override?.location ?? event.location,
        category_id: override?.category_id ?? event.category_id,
        start_at: computedStart,
        end_at: computedEnd,
        timezone: event.timezone,
        color: override?.color ?? event.color,
        reminder_offsets: event.reminder_offsets,
        is_recurring_instance: true,
        layout: { column: 0, columns: 1 },
      });
    }
  }

  return layoutOccurrences(occurrences);
}

export function layoutOccurrences(occurrences: EventOccurrence[]) {
  const ordered = [...occurrences].sort((left, right) =>
    left.start_at.localeCompare(right.start_at),
  );
  const groups: EventOccurrence[][] = [];
  let current: EventOccurrence[] = [];
  let currentGroupEnd = "";

  for (const occurrence of ordered) {
    if (current.length === 0) {
      current = [occurrence];
      currentGroupEnd = occurrence.end_at;
      continue;
    }

    if (occurrence.start_at < currentGroupEnd) {
      current.push(occurrence);
      if (occurrence.end_at > currentGroupEnd) {
        currentGroupEnd = occurrence.end_at;
      }
      continue;
    }

    groups.push(current);
    current = [occurrence];
    currentGroupEnd = occurrence.end_at;
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups.flatMap((group) => {
    const columnEndTimes: string[] = [];

    for (const occurrence of group) {
      let columnIndex = columnEndTimes.findIndex(
        (endAt) => endAt <= occurrence.start_at,
      );

      if (columnIndex === -1) {
        columnIndex = columnEndTimes.length;
        columnEndTimes.push(occurrence.end_at);
      } else {
        columnEndTimes[columnIndex] = occurrence.end_at;
      }

      occurrence.layout = {
        column: columnIndex,
        columns: 1,
      };
    }

    const totalColumns = columnEndTimes.length || 1;
    return group.map((occurrence) => ({
      ...occurrence,
      layout: {
        column: occurrence.layout.column,
        columns: totalColumns,
      },
    }));
  });
}

export function buildOccurrenceStyle(occurrence: EventOccurrence) {
  return {
    top: `${getTimelineOffset(occurrence.start_at)}px`,
    height: `${Math.max(44, getTimelineHeight(occurrence.start_at, occurrence.end_at))}px`,
    left: `calc(${(occurrence.layout.column / occurrence.layout.columns) * 100}% + ${
      occurrence.layout.column * 6
    }px)`,
    width: `calc(${100 / occurrence.layout.columns}% - ${
      (occurrence.layout.columns - 1) * 6
    }px)`,
  };
}
