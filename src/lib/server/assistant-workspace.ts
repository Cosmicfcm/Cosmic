import type { SupabaseClient } from "@supabase/supabase-js";

import { materializeEventReminders, materializeTaskReminders } from "@/lib/reminders";
import { buildRecurrenceString } from "@/lib/recurrence";
import type {
  AssistantAction,
  EventOverride,
  EventRecord,
  Goal,
  Note,
  Task,
  WorkspaceSnapshot,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export async function loadWorkspaceSnapshotForUser(client: SupabaseClient) {
  const [
    categoriesResult,
    eventsResult,
    rulesResult,
    overridesResult,
    tasksResult,
    notesResult,
    goalsResult,
    remindersResult,
    subscriptionsResult,
  ] = await Promise.all([
    client.from("categories").select("*").order("name"),
    client.from("events").select("*").order("start_at"),
    client.from("event_recurrence_rules").select("*").order("created_at"),
    client.from("event_overrides").select("*").order("occurrence_date"),
    client.from("tasks").select("*").order("created_at", { ascending: false }),
    client.from("notes").select("*").order("updated_at", { ascending: false }),
    client.from("goals").select("*").order("created_at", { ascending: false }),
    client.from("reminders").select("*").order("due_at"),
    client.from("push_subscriptions").select("*"),
  ]);

  return {
    categories: categoriesResult.data ?? [],
    events: eventsResult.data ?? [],
    eventRecurrenceRules: rulesResult.data ?? [],
    eventOverrides: overridesResult.data ?? [],
    tasks: tasksResult.data ?? [],
    notes: notesResult.data ?? [],
    goals: goalsResult.data ?? [],
    reminders: remindersResult.data ?? [],
    pushSubscriptions: subscriptionsResult.data ?? [],
  } satisfies WorkspaceSnapshot;
}

function cloneWorkspace(workspace: WorkspaceSnapshot): WorkspaceSnapshot {
  return JSON.parse(JSON.stringify(workspace)) as WorkspaceSnapshot;
}

function pickString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function pickNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function pickNumberArray(value: unknown, fallback: number[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter((item): item is number => typeof item === "number");
}

function applyEventAction(
  workspace: WorkspaceSnapshot,
  action: AssistantAction,
  userId: string | null,
) {
  const payload = action.payload;
  const targetEvent = action.targetId
    ? workspace.events.find((event) => event.id === action.targetId)
    : null;

  if (action.operation === "create") {
    const eventId = action.targetId ?? generateId();
    const recurrenceInput = payload.recurrence as
      | {
          frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
          interval?: number;
          byWeekday?: number[];
          until?: string | null;
        }
      | undefined;
    const recurrenceRule = recurrenceInput
      ? buildRecurrenceString({
          frequency: recurrenceInput.frequency ?? "WEEKLY",
          interval: recurrenceInput.interval ?? 1,
          byWeekday: recurrenceInput.byWeekday ?? [],
          until: recurrenceInput.until ?? null,
        })
      : null;
    const recurrenceId = recurrenceRule ? `${eventId}-rrule` : null;
    const categoryId = pickNullableString(payload.category_id);
    const color =
      workspace.categories.find((category) => category.id === categoryId)?.color ?? null;

    const nextEvent: EventRecord = {
      id: eventId,
      user_id: userId,
      title: pickString(payload.title, "New event"),
      description: pickString(payload.description),
      location: pickString(payload.location),
      category_id: categoryId,
      start_at: pickString(payload.start_at, new Date().toISOString()),
      end_at: pickString(payload.end_at, new Date(Date.now() + 60 * 60_000).toISOString()),
      timezone: pickString(payload.timezone, "UTC"),
      reminder_offsets: pickNumberArray(payload.reminder_offsets, [10]),
      color,
      recurrence_rule_id: recurrenceId,
    };

    workspace.events = [
      ...workspace.events.filter((event) => event.id !== eventId),
      nextEvent,
    ].sort((left, right) => left.start_at.localeCompare(right.start_at));

    workspace.eventRecurrenceRules = workspace.eventRecurrenceRules.filter(
      (rule) => rule.event_id !== eventId,
    );

    if (recurrenceRule) {
      workspace.eventRecurrenceRules.push({
        id: recurrenceId ?? generateId(),
        user_id: userId,
        event_id: eventId,
        rrule: recurrenceRule,
        timezone: nextEvent.timezone,
        exdates: [],
      });
    }
    return;
  }

  if (!targetEvent) {
    return;
  }

  if (action.operation === "update") {
    if (action.applyScope === "instance" || payload.occurrence_date) {
      const override: EventOverride = {
        id: generateId(),
        user_id: userId,
        event_id: targetEvent.id,
        occurrence_date: pickString(payload.occurrence_date, targetEvent.start_at.slice(0, 10)),
        is_cancelled: false,
        title: pickNullableString(payload.title),
        description: pickNullableString(payload.description),
        location: pickNullableString(payload.location),
        start_at: pickNullableString(payload.start_at),
        end_at: pickNullableString(payload.end_at),
        category_id: pickNullableString(payload.category_id),
        color: null,
      };
      workspace.eventOverrides = [
        ...workspace.eventOverrides.filter(
          (item) =>
            !(
              item.event_id === override.event_id &&
              item.occurrence_date === override.occurrence_date
            ),
        ),
        override,
      ];
      return;
    }

    const categoryId = pickNullableString(payload.category_id) ?? targetEvent.category_id;
    const color =
      workspace.categories.find((category) => category.id === categoryId)?.color ??
      targetEvent.color;

    workspace.events = workspace.events.map((event) =>
      event.id === targetEvent.id
        ? {
            ...event,
            title: pickString(payload.title, event.title),
            description: pickString(payload.description, event.description),
            location: pickString(payload.location, event.location),
            category_id: categoryId,
            start_at: pickString(payload.start_at, event.start_at),
            end_at: pickString(payload.end_at, event.end_at),
            timezone: pickString(payload.timezone, event.timezone),
            reminder_offsets: pickNumberArray(
              payload.reminder_offsets,
              event.reminder_offsets,
            ),
            color,
          }
        : event,
    );
    return;
  }

  if (action.operation === "delete") {
    if (action.applyScope === "instance" || payload.occurrence_date) {
      const override: EventOverride = {
        id: generateId(),
        user_id: userId,
        event_id: targetEvent.id,
        occurrence_date: pickString(payload.occurrence_date, targetEvent.start_at.slice(0, 10)),
        is_cancelled: true,
        title: null,
        description: null,
        location: null,
        start_at: null,
        end_at: null,
        category_id: null,
        color: null,
      };
      workspace.eventOverrides = [
        ...workspace.eventOverrides.filter(
          (item) =>
            !(
              item.event_id === override.event_id &&
              item.occurrence_date === override.occurrence_date
            ),
        ),
        override,
      ];
      return;
    }

    workspace.events = workspace.events.filter((event) => event.id !== targetEvent.id);
    workspace.eventRecurrenceRules = workspace.eventRecurrenceRules.filter(
      (rule) => rule.event_id !== targetEvent.id,
    );
    workspace.eventOverrides = workspace.eventOverrides.filter(
      (override) => override.event_id !== targetEvent.id,
    );
  }
}

function applyTaskAction(
  workspace: WorkspaceSnapshot,
  action: AssistantAction,
  userId: string | null,
) {
  const payload = action.payload;
  const existing = action.targetId
    ? workspace.tasks.find((task) => task.id === action.targetId)
    : null;

  if (action.operation === "delete") {
    workspace.tasks = workspace.tasks.filter((task) => task.id !== action.targetId);
    return;
  }

  const task: Task = {
    id: action.targetId ?? generateId(),
    user_id: userId,
    title: pickString(payload.title, existing?.title ?? "New task"),
    description: pickString(payload.description, existing?.description ?? ""),
    completed:
      typeof payload.completed === "boolean"
        ? payload.completed
        : existing?.completed ?? false,
    due_at: pickNullableString(payload.due_at) ?? existing?.due_at ?? null,
    linked_event_id:
      pickNullableString(payload.linked_event_id) ?? existing?.linked_event_id ?? null,
    category_id: pickNullableString(payload.category_id) ?? existing?.category_id ?? null,
    priority:
      (pickString(payload.priority, existing?.priority ?? "medium") as Task["priority"]) ??
      "medium",
    reminder_at:
      pickNullableString(payload.reminder_at) ?? existing?.reminder_at ?? null,
  };

  workspace.tasks = [...workspace.tasks.filter((item) => item.id !== task.id), task];
}

function applyNoteAction(
  workspace: WorkspaceSnapshot,
  action: AssistantAction,
  userId: string | null,
) {
  const payload = action.payload;
  const existing = action.targetId
    ? workspace.notes.find((note) => note.id === action.targetId)
    : null;

  if (action.operation === "delete") {
    workspace.notes = workspace.notes.filter((note) => note.id !== action.targetId);
    return;
  }

  const tags =
    Array.isArray(payload.tags) && payload.tags.every((tag) => typeof tag === "string")
      ? payload.tags
      : existing?.tags ?? [];

  const note: Note = {
    id: action.targetId ?? generateId(),
    user_id: userId,
    title: pickString(payload.title, existing?.title ?? "Quick note"),
    content: pickString(payload.content, existing?.content ?? ""),
    tags,
    pinned:
      typeof payload.pinned === "boolean"
        ? payload.pinned
        : existing?.pinned ?? false,
    search_text: `${pickString(payload.title, existing?.title ?? "")} ${pickString(
      payload.content,
      existing?.content ?? "",
    )} ${tags.join(" ")}`.toLowerCase(),
  };

  workspace.notes = [note, ...workspace.notes.filter((item) => item.id !== note.id)];
}

function applyGoalAction(
  workspace: WorkspaceSnapshot,
  action: AssistantAction,
  userId: string | null,
) {
  const payload = action.payload;
  const existing = action.targetId
    ? workspace.goals.find((goal) => goal.id === action.targetId)
    : null;

  if (action.operation === "delete") {
    workspace.goals = workspace.goals.filter((goal) => goal.id !== action.targetId);
    return;
  }

  const linkedTaskIds =
    Array.isArray(payload.linked_task_ids) &&
    payload.linked_task_ids.every((item) => typeof item === "string")
      ? payload.linked_task_ids
      : existing?.linked_task_ids ?? [];

  const goal: Goal = {
    id: action.targetId ?? generateId(),
    user_id: userId,
    title: pickString(payload.title, existing?.title ?? "New goal"),
    description: pickString(payload.description, existing?.description ?? ""),
    horizon: (pickString(payload.horizon, existing?.horizon ?? "short") as Goal["horizon"]) ??
      "short",
    progress:
      typeof payload.progress === "number"
        ? payload.progress
        : existing?.progress ?? 0,
    target_date:
      pickNullableString(payload.target_date) ?? existing?.target_date ?? null,
    category_id:
      pickNullableString(payload.category_id) ?? existing?.category_id ?? null,
    linked_task_ids: linkedTaskIds,
  };

  workspace.goals = [goal, ...workspace.goals.filter((item) => item.id !== goal.id)];
}

export function applyActionsToWorkspace(params: {
  workspace: WorkspaceSnapshot;
  actions: AssistantAction[];
  userId: string | null;
}) {
  const workspace = cloneWorkspace(params.workspace);

  for (const action of params.actions) {
    switch (action.entityType) {
      case "event":
        applyEventAction(workspace, action, params.userId);
        break;
      case "task":
        applyTaskAction(workspace, action, params.userId);
        break;
      case "note":
        applyNoteAction(workspace, action, params.userId);
        break;
      case "goal":
        applyGoalAction(workspace, action, params.userId);
        break;
      default:
        break;
    }
  }

  workspace.reminders = [
    ...materializeEventReminders({
      events: workspace.events,
      rules: workspace.eventRecurrenceRules,
      overrides: workspace.eventOverrides,
      userId: params.userId,
    }),
    ...materializeTaskReminders(workspace.tasks, params.userId),
  ];

  return workspace;
}

export async function persistWorkspaceSnapshot(
  client: SupabaseClient,
  workspace: WorkspaceSnapshot,
) {
  await client.from("reminders").delete().neq("id", "");
  await client.from("event_overrides").delete().neq("id", "");
  await client.from("event_recurrence_rules").delete().neq("id", "");
  await client.from("events").delete().neq("id", "");
  await client.from("tasks").delete().neq("id", "");
  await client.from("notes").delete().neq("id", "");
  await client.from("goals").delete().neq("id", "");

  if (workspace.events.length > 0) {
    await client.from("events").insert(workspace.events);
  }
  if (workspace.eventRecurrenceRules.length > 0) {
    await client
      .from("event_recurrence_rules")
      .insert(workspace.eventRecurrenceRules);
  }
  if (workspace.eventOverrides.length > 0) {
    await client.from("event_overrides").insert(workspace.eventOverrides);
  }
  if (workspace.tasks.length > 0) {
    await client.from("tasks").insert(workspace.tasks);
  }
  if (workspace.notes.length > 0) {
    await client.from("notes").insert(workspace.notes);
  }
  if (workspace.goals.length > 0) {
    await client.from("goals").insert(workspace.goals);
  }
  if (workspace.reminders.length > 0) {
    await client.from("reminders").insert(workspace.reminders);
  }
}

export function isLowRiskAction(
  action: AssistantAction,
  workspace: WorkspaceSnapshot,
) {
  if (action.operation === "delete" || action.operation === "optimize_schedule") {
    return false;
  }

  if (action.entityType === "event" && action.operation === "update") {
    const targetEvent = action.targetId
      ? workspace.events.find((event) => event.id === action.targetId)
      : null;
    return Boolean(targetEvent && !targetEvent.recurrence_rule_id && !action.applyScope);
  }

  if (action.entityType === "event" && action.operation === "create") {
    return true;
  }

  if (action.entityType === "task") {
    return true;
  }

  if (action.entityType === "note") {
    return true;
  }

  if (action.entityType === "goal") {
    return true;
  }

  return false;
}
