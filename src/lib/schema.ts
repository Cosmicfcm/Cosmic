import { z } from "zod";

export const categorySchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  name: z.string().min(1),
  color: z.string().min(1),
  icon: z.string().nullable().optional(),
});

export const recurrenceRuleSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  event_id: z.string(),
  rrule: z.string(),
  timezone: z.string(),
  exdates: z.array(z.string()).default([]),
});

export const eventSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  title: z.string().min(1),
  description: z.string().default(""),
  location: z.string().default(""),
  category_id: z.string().nullable(),
  start_at: z.string(),
  end_at: z.string(),
  timezone: z.string(),
  reminder_offsets: z.array(z.number().int()).default([]),
  color: z.string().nullable().default(null),
  recurrence_rule_id: z.string().nullable().default(null),
});

export const eventOverrideSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  event_id: z.string(),
  occurrence_date: z.string(),
  is_cancelled: z.boolean(),
  title: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  start_at: z.string().nullable().default(null),
  end_at: z.string().nullable().default(null),
  category_id: z.string().nullable().default(null),
  color: z.string().nullable().default(null),
});

export const taskSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  title: z.string(),
  description: z.string().default(""),
  completed: z.boolean(),
  due_at: z.string().nullable().default(null),
  linked_event_id: z.string().nullable().default(null),
  category_id: z.string().nullable().default(null),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  reminder_at: z.string().nullable().default(null),
});

export const noteSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  search_text: z.string().default(""),
});

export const goalSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  title: z.string(),
  description: z.string().default(""),
  horizon: z.enum(["short", "long"]).default("short"),
  progress: z.number().min(0).max(100).default(0),
  target_date: z.string().nullable().default(null),
  category_id: z.string().nullable().default(null),
  linked_task_ids: z.array(z.string()).default([]),
});

export const reminderSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  entity_type: z.enum(["event", "task"]),
  entity_id: z.string(),
  due_at: z.string(),
  title: z.string(),
  body: z.string(),
  sent_at: z.string().nullable().default(null),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  expirationTime: z.number().nullable().optional(),
});

export const assistantActionSchema = z.object({
  id: z.string(),
  operation: z.enum(["create", "update", "delete", "optimize_schedule"]),
  entityType: z.enum(["event", "task", "note", "goal"]),
  targetId: z.string().nullable(),
  applyScope: z.enum(["instance", "series"]).optional(),
  reason: z.string(),
  safety: z.enum(["low", "review"]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const assistantReplySchema = z.object({
  reply: z.string(),
  actions: z.array(assistantActionSchema).default([]),
  warnings: z.array(z.string()).default([]),
});

export const assistantRequestSchema = z.object({
  message: z.string().min(1).optional(),
  selectedDate: z.string().optional(),
  timezone: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  confirmedActions: z.array(assistantActionSchema).optional(),
});

export const workspaceImportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  workspace: z.object({
    categories: z.array(categorySchema),
    events: z.array(eventSchema),
    eventRecurrenceRules: z.array(recurrenceRuleSchema),
    eventOverrides: z.array(eventOverrideSchema),
    tasks: z.array(taskSchema),
    notes: z.array(noteSchema),
    goals: z.array(goalSchema),
    reminders: z.array(reminderSchema),
    pushSubscriptions: z.array(
      z.object({
        id: z.string(),
        user_id: z.string().nullable(),
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        expiration_time: z.number().nullable(),
      }),
    ),
  }),
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
