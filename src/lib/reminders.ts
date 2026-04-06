import { addDays, isAfter, isBefore, parseISO } from "date-fns";

import { expandEventOccurrences } from "@/lib/recurrence";
import type {
  EventOverride,
  EventRecurrenceRule,
  EventRecord,
  Reminder,
  Task,
} from "@/lib/types";

export function materializeEventReminders(params: {
  events: EventRecord[];
  rules: EventRecurrenceRule[];
  overrides: EventOverride[];
  windowStart?: Date;
  windowEnd?: Date;
  userId: string | null;
}) {
  const rangeStart = params.windowStart ?? new Date();
  const rangeEnd = params.windowEnd ?? addDays(rangeStart, 14);
  const occurrences = expandEventOccurrences({
    events: params.events,
    rules: params.rules,
    overrides: params.overrides,
    rangeStart,
    rangeEnd,
  });

  return occurrences.flatMap((occurrence) =>
    occurrence.reminder_offsets.map<Reminder>((offset) => ({
      id: `${occurrence.id}:${offset}`,
      user_id: params.userId,
      entity_type: "event",
      entity_id: occurrence.event_id,
      due_at: new Date(
        parseISO(occurrence.start_at).getTime() - offset * 60_000,
      ).toISOString(),
      title: occurrence.title,
      body: `Upcoming at ${new Date(occurrence.start_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`,
      sent_at: null,
      meta: {
        occurrence_date: occurrence.occurrence_date,
        offset,
      },
    })),
  );
}

export function materializeTaskReminders(
  tasks: Task[],
  userId: string | null,
) {
  return tasks.flatMap<Reminder>((task) => {
    if (!task.reminder_at) {
      return [];
    }

    return [
      {
        id: `${task.id}:task-reminder`,
        user_id: userId,
        entity_type: "task",
        entity_id: task.id,
        due_at: task.reminder_at,
        title: task.title,
        body: task.description || "Task reminder from Cosmic.",
        sent_at: null,
        meta: {},
      },
    ];
  });
}

export function filterDueReminders(reminders: Reminder[], at = new Date()) {
  return reminders.filter((reminder) => {
    const dueAt = parseISO(reminder.due_at);
    return !reminder.sent_at && !isAfter(dueAt, at) && !isBefore(dueAt, new Date(0));
  });
}
