import { addMinutes, parseISO } from "date-fns";

import { materializeEventReminders, materializeTaskReminders } from "@/lib/reminders";
import { buildRecurrenceString } from "@/lib/recurrence";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { saveDemoWorkspace } from "@/lib/workspace";
import { generateId, unique } from "@/lib/utils";
import type {
  EventDraft,
  EventOccurrence,
  EventOverride,
  EventRecurrenceRule,
  EventRecord,
  Goal,
  GoalDraft,
  Note,
  NoteDraft,
  Task,
  TaskDraft,
  WorkspaceSnapshot,
} from "@/lib/types";
import {
  createDefaultEventDraft,
  createDefaultGoalDraft,
  createDefaultNoteDraft,
  createDefaultTaskDraft,
  snapshotFromState,
  useCosmicStore,
} from "@/store/cosmic-store";

function getSnapshot(overrides?: Partial<WorkspaceSnapshot>): WorkspaceSnapshot {
  const state = useCosmicStore.getState();
  return {
    ...snapshotFromState(state),
    ...overrides,
  };
}

async function syncReminders(overrides?: Partial<WorkspaceSnapshot>) {
  const client = getBrowserSupabaseClient();
  const state = useCosmicStore.getState();
  const snapshot = getSnapshot(overrides);
  const reminders = [
    ...materializeEventReminders({
      events: snapshot.events,
      rules: snapshot.eventRecurrenceRules,
      overrides: snapshot.eventOverrides,
      userId: state.user?.id ?? null,
    }),
    ...materializeTaskReminders(snapshot.tasks, state.user?.id ?? null),
  ];

  if (client && state.mode === "authenticated") {
    await client.from("reminders").delete().neq("id", "");
    if (reminders.length > 0) {
      await client.from("reminders").upsert(reminders);
    }
  }

  useCosmicStore.getState().setWorkspace({ reminders });
  return reminders;
}

async function persistDemoIfNeeded(snapshot?: WorkspaceSnapshot) {
  const state = useCosmicStore.getState();
  if (state.mode === "demo") {
    saveDemoWorkspace(snapshot ?? snapshotFromState(state));
  }
}

export async function saveEventDraft(draft: EventDraft) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const eventId = draft.id ?? generateId();
  const hasRecurrence = draft.recurrence.enabled;
  const recurrenceRule =
    hasRecurrence && draft.recurrence.rrule
      ? draft.recurrence.rrule
      : hasRecurrence
        ? buildRecurrenceString({
            frequency: draft.recurrence.frequency,
            interval: draft.recurrence.interval,
            byWeekday: draft.recurrence.byWeekday,
            until: draft.recurrence.until,
          })
        : null;
  const recurrenceId = recurrenceRule ? `${eventId}-rrule` : null;
  const eventRecord: EventRecord = {
    id: eventId,
    user_id: state.user?.id ?? null,
    title: draft.title.trim(),
    description: draft.description.trim(),
    location: draft.location.trim(),
    category_id: draft.category_id,
    start_at: new Date(draft.start_at).toISOString(),
    end_at: new Date(draft.end_at).toISOString(),
    timezone: draft.timezone,
    reminder_offsets: unique(draft.reminder_offsets).sort((a, b) => a - b),
    color:
      state.categories.find((item) => item.id === draft.category_id)?.color ?? null,
    recurrence_rule_id: recurrenceId,
  };

  let nextEvents = state.events;
  let nextRules = state.eventRecurrenceRules;
  let nextOverrides = state.eventOverrides;

  if (draft.sourceEventId && draft.applyScope === "instance") {
    const override: EventOverride = {
      id: generateId(),
      user_id: state.user?.id ?? null,
      event_id: draft.sourceEventId,
      occurrence_date: draft.occurrenceDate ?? draft.start_at.slice(0, 10),
      is_cancelled: false,
      title: draft.title,
      description: draft.description,
      location: draft.location,
      start_at: new Date(draft.start_at).toISOString(),
      end_at: new Date(draft.end_at).toISOString(),
      category_id: draft.category_id,
      color: eventRecord.color,
    };
    nextOverrides = [
      ...state.eventOverrides.filter(
        (item) =>
          !(
            item.event_id === override.event_id &&
            item.occurrence_date === override.occurrence_date
          ),
      ),
      override,
    ];

    if (client && state.mode === "authenticated") {
      await client.from("event_overrides").upsert(override);
    }
  } else {
    nextEvents = [
      ...state.events.filter((item) => item.id !== eventId),
      eventRecord,
    ].sort((left, right) => left.start_at.localeCompare(right.start_at));
    nextRules = state.eventRecurrenceRules.filter((rule) => rule.event_id !== eventId);

    if (recurrenceRule) {
      const nextRule: EventRecurrenceRule = {
        id: recurrenceId ?? generateId(),
        user_id: state.user?.id ?? null,
        event_id: eventId,
        rrule: recurrenceRule,
        timezone: draft.timezone,
        exdates: [],
      };
      nextRules = [...nextRules, nextRule];
    }

    if (client && state.mode === "authenticated") {
      await client.from("events").upsert(eventRecord);
      await client.from("event_recurrence_rules").delete().eq("event_id", eventId);
      if (recurrenceRule) {
        await client.from("event_recurrence_rules").insert({
          id: recurrenceId ?? generateId(),
          user_id: state.user?.id ?? null,
          event_id: eventId,
          rrule: recurrenceRule,
          timezone: draft.timezone,
          exdates: [],
        });
      }
    }
  }

  useCosmicStore.getState().setWorkspace({
    events: nextEvents,
    eventRecurrenceRules: nextRules,
    eventOverrides: nextOverrides,
  });
  await syncReminders({
    events: nextEvents,
    eventRecurrenceRules: nextRules,
    eventOverrides: nextOverrides,
  });
  useCosmicStore.getState().closeEventEditor();
  useCosmicStore.getState().setSyncMessage("Event saved.");
  await persistDemoIfNeeded(getSnapshot());
}

export async function moveOccurrence(occurrence: EventOccurrence, deltaMinutes: number) {
  const nextStart = new Date(parseISO(occurrence.start_at).getTime() + deltaMinutes * 60_000);
  const nextEnd = new Date(parseISO(occurrence.end_at).getTime() + deltaMinutes * 60_000);
  await saveEventDraft({
    ...createDefaultEventDraft({
      id: occurrence.event_id,
      sourceEventId: occurrence.event_id,
      occurrenceDate: occurrence.occurrence_date,
      applyScope: occurrence.is_recurring_instance ? "instance" : "series",
      title: occurrence.title,
      description: occurrence.description,
      location: occurrence.location,
      category_id: occurrence.category_id,
      reminder_offsets: occurrence.reminder_offsets,
    }),
    start_at: nextStart.toISOString().slice(0, 16),
    end_at: nextEnd.toISOString().slice(0, 16),
    timezone: occurrence.timezone,
  });
}

export async function resizeOccurrence(
  occurrence: EventOccurrence,
  durationMinutes: number,
) {
  const nextEnd = addMinutes(parseISO(occurrence.start_at), durationMinutes);
  await saveEventDraft({
    ...createDefaultEventDraft({
      id: occurrence.event_id,
      sourceEventId: occurrence.event_id,
      occurrenceDate: occurrence.occurrence_date,
      applyScope: occurrence.is_recurring_instance ? "instance" : "series",
      title: occurrence.title,
      description: occurrence.description,
      location: occurrence.location,
      category_id: occurrence.category_id,
      reminder_offsets: occurrence.reminder_offsets,
    }),
    start_at: occurrence.start_at.slice(0, 16),
    end_at: nextEnd.toISOString().slice(0, 16),
    timezone: occurrence.timezone,
  });
}

export async function deleteEventOccurrence(
  occurrence: EventOccurrence,
  scope?: "instance" | "series",
) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const applyScope = scope ?? (occurrence.is_recurring_instance ? "instance" : "series");

  if (applyScope === "instance") {
    const override: EventOverride = {
      id: generateId(),
      user_id: state.user?.id ?? null,
      event_id: occurrence.event_id,
      occurrence_date: occurrence.occurrence_date,
      is_cancelled: true,
      title: null,
      description: null,
      location: null,
      start_at: null,
      end_at: null,
      category_id: null,
      color: null,
    };
    const nextOverrides = [
      ...state.eventOverrides.filter(
        (item) =>
          !(
            item.event_id === override.event_id &&
            item.occurrence_date === override.occurrence_date
          ),
      ),
      override,
    ];
    useCosmicStore.getState().setWorkspace({ eventOverrides: nextOverrides });
    await syncReminders({ eventOverrides: nextOverrides });
    if (client && state.mode === "authenticated") {
      await client.from("event_overrides").upsert(override);
    }
    await persistDemoIfNeeded(getSnapshot({ eventOverrides: nextOverrides }));
    return;
  }

  const nextEvents = state.events.filter((item) => item.id !== occurrence.event_id);
  const nextRules = state.eventRecurrenceRules.filter(
    (item) => item.event_id !== occurrence.event_id,
  );
  const nextOverrides = state.eventOverrides.filter(
    (item) => item.event_id !== occurrence.event_id,
  );
  useCosmicStore.getState().setWorkspace({
    events: nextEvents,
    eventRecurrenceRules: nextRules,
    eventOverrides: nextOverrides,
  });
  await syncReminders({
    events: nextEvents,
    eventRecurrenceRules: nextRules,
    eventOverrides: nextOverrides,
  });
  if (client && state.mode === "authenticated") {
    await client.from("event_overrides").delete().eq("event_id", occurrence.event_id);
    await client.from("event_recurrence_rules").delete().eq("event_id", occurrence.event_id);
    await client.from("events").delete().eq("id", occurrence.event_id);
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function saveTaskDraft(draft: TaskDraft) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const existing = state.tasks.find((item) => item.id === draft.id);
  const task: Task = {
    id: draft.id ?? generateId(),
    user_id: state.user?.id ?? null,
    title: draft.title.trim(),
    description: draft.description.trim(),
    completed: existing?.completed ?? false,
    due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
    linked_event_id: draft.linked_event_id,
    category_id: draft.category_id,
    priority: draft.priority,
    reminder_at: draft.reminder_at ? new Date(draft.reminder_at).toISOString() : null,
  };
  const nextTasks = [...state.tasks.filter((item) => item.id !== task.id), task];
  useCosmicStore.getState().setWorkspace({ tasks: nextTasks });
  await syncReminders({ tasks: nextTasks });
  useCosmicStore.getState().closeTaskEditor();
  if (client && state.mode === "authenticated") {
    await client.from("tasks").upsert(task);
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function toggleTask(taskId: string) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const nextTasks = state.tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task,
  );
  useCosmicStore.getState().setWorkspace({ tasks: nextTasks });
  if (client && state.mode === "authenticated") {
    const updated = nextTasks.find((task) => task.id === taskId);
    if (updated) {
      await client.from("tasks").upsert(updated);
    }
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function deleteTask(taskId: string) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const nextTasks = state.tasks.filter((task) => task.id !== taskId);
  useCosmicStore.getState().setWorkspace({ tasks: nextTasks });
  await syncReminders({ tasks: nextTasks });
  if (client && state.mode === "authenticated") {
    await client.from("tasks").delete().eq("id", taskId);
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function saveNoteDraft(draft: NoteDraft) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const note: Note = {
    id: draft.id ?? generateId(),
    user_id: state.user?.id ?? null,
    title: draft.title.trim(),
    content: draft.content.trim(),
    tags: draft.tags,
    pinned: draft.pinned,
    search_text: `${draft.title} ${draft.content} ${draft.tags.join(" ")}`.toLowerCase(),
  };
  const nextNotes = [note, ...state.notes.filter((item) => item.id !== note.id)];
  useCosmicStore.getState().setWorkspace({ notes: nextNotes });
  useCosmicStore.getState().closeNoteEditor();
  if (client && state.mode === "authenticated") {
    await client.from("notes").upsert(note);
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function deleteNote(noteId: string) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const nextNotes = state.notes.filter((item) => item.id !== noteId);
  useCosmicStore.getState().setWorkspace({ notes: nextNotes });
  if (client && state.mode === "authenticated") {
    await client.from("notes").delete().eq("id", noteId);
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function saveGoalDraft(draft: GoalDraft) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const goal: Goal = {
    id: draft.id ?? generateId(),
    user_id: state.user?.id ?? null,
    title: draft.title.trim(),
    description: draft.description.trim(),
    horizon: draft.horizon,
    progress: draft.progress,
    target_date: draft.target_date ? new Date(draft.target_date).toISOString() : null,
    category_id: draft.category_id,
    linked_task_ids: draft.linked_task_ids,
  };
  const nextGoals = [goal, ...state.goals.filter((item) => item.id !== goal.id)];
  useCosmicStore.getState().setWorkspace({ goals: nextGoals });
  useCosmicStore.getState().closeGoalEditor();
  if (client && state.mode === "authenticated") {
    await client.from("goals").upsert(goal);
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function deleteGoal(goalId: string) {
  const state = useCosmicStore.getState();
  const client = getBrowserSupabaseClient();
  const nextGoals = state.goals.filter((item) => item.id !== goalId);
  useCosmicStore.getState().setWorkspace({ goals: nextGoals });
  if (client && state.mode === "authenticated") {
    await client.from("goals").delete().eq("id", goalId);
  }
  await persistDemoIfNeeded(getSnapshot());
}

export async function importWorkspace(workspace: WorkspaceSnapshot) {
  useCosmicStore.getState().setWorkspace(workspace);
  await persistDemoIfNeeded(workspace);
}

export function resetEditorDrafts() {
  const state = useCosmicStore.getState();
  state.closeEventEditor();
  state.closeTaskEditor();
  state.closeNoteEditor();
  state.closeGoalEditor();
}

export {
  createDefaultEventDraft,
  createDefaultGoalDraft,
  createDefaultNoteDraft,
  createDefaultTaskDraft,
};
