export type UUID = string;

export type WorkspaceSection =
  | "day"
  | "tasks"
  | "remember"
  | "goals"
  | "settings";

export type GoalHorizon = "short" | "long";
export type TaskPriority = "low" | "medium" | "high";
export type AssistantOperation =
  | "create"
  | "update"
  | "delete"
  | "optimize_schedule";
export type AssistantEntityType = "event" | "task" | "note" | "goal";
export type EventEditScope = "instance" | "series";

export interface Category {
  id: UUID;
  user_id: UUID | null;
  name: string;
  color: string;
  icon?: string | null;
  created_at?: string;
}

export interface EventRecurrenceRule {
  id: UUID;
  user_id: UUID | null;
  event_id: UUID;
  rrule: string;
  timezone: string;
  exdates: string[];
  created_at?: string;
  updated_at?: string;
}

export interface EventRecord {
  id: UUID;
  user_id: UUID | null;
  title: string;
  description: string;
  location: string;
  category_id: UUID | null;
  start_at: string;
  end_at: string;
  timezone: string;
  reminder_offsets: number[];
  color: string | null;
  recurrence_rule_id: UUID | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventOverride {
  id: UUID;
  user_id: UUID | null;
  event_id: UUID;
  occurrence_date: string;
  is_cancelled: boolean;
  title: string | null;
  description: string | null;
  location: string | null;
  start_at: string | null;
  end_at: string | null;
  category_id: UUID | null;
  color: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventOccurrence {
  id: UUID;
  event_id: UUID;
  occurrence_date: string;
  title: string;
  description: string;
  location: string;
  category_id: UUID | null;
  start_at: string;
  end_at: string;
  timezone: string;
  color: string | null;
  reminder_offsets: number[];
  is_recurring_instance: boolean;
  layout: {
    column: number;
    columns: number;
  };
}

export interface Task {
  id: UUID;
  user_id: UUID | null;
  title: string;
  description: string;
  completed: boolean;
  due_at: string | null;
  linked_event_id: UUID | null;
  category_id: UUID | null;
  priority: TaskPriority;
  reminder_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Note {
  id: UUID;
  user_id: UUID | null;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  search_text: string;
  created_at?: string;
  updated_at?: string;
}

export interface Goal {
  id: UUID;
  user_id: UUID | null;
  title: string;
  description: string;
  horizon: GoalHorizon;
  progress: number;
  target_date: string | null;
  category_id: UUID | null;
  linked_task_ids: UUID[];
  created_at?: string;
  updated_at?: string;
}

export interface Reminder {
  id: UUID;
  user_id: UUID | null;
  entity_type: "event" | "task";
  entity_id: UUID;
  due_at: string;
  title: string;
  body: string;
  sent_at: string | null;
  meta: Record<string, unknown>;
  created_at?: string;
}

export interface PushSubscriptionRecord {
  id: UUID;
  user_id: UUID | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
  created_at?: string;
}

export interface WorkspaceSnapshot {
  categories: Category[];
  events: EventRecord[];
  eventRecurrenceRules: EventRecurrenceRule[];
  eventOverrides: EventOverride[];
  tasks: Task[];
  notes: Note[];
  goals: Goal[];
  reminders: Reminder[];
  pushSubscriptions: PushSubscriptionRecord[];
}

export interface EventDraft {
  id?: UUID;
  sourceEventId?: UUID;
  occurrenceDate?: string | null;
  applyScope?: EventEditScope;
  title: string;
  description: string;
  location: string;
  category_id: UUID | null;
  start_at: string;
  end_at: string;
  timezone: string;
  reminder_offsets: number[];
  recurrence: {
    enabled: boolean;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    interval: number;
    byWeekday: number[];
    until: string | null;
    rrule: string | null;
  };
}

export interface TaskDraft {
  id?: UUID;
  title: string;
  description: string;
  due_at: string | null;
  linked_event_id: UUID | null;
  category_id: UUID | null;
  priority: TaskPriority;
  reminder_at: string | null;
}

export interface NoteDraft {
  id?: UUID;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
}

export interface GoalDraft {
  id?: UUID;
  title: string;
  description: string;
  horizon: GoalHorizon;
  progress: number;
  target_date: string | null;
  category_id: UUID | null;
  linked_task_ids: UUID[];
}

export interface AssistantAction {
  id: string;
  operation: AssistantOperation;
  entityType: AssistantEntityType;
  targetId: string | null;
  applyScope?: EventEditScope;
  reason: string;
  safety: "low" | "review";
  payload: Record<string, unknown>;
}

export interface AssistantReply {
  reply: string;
  actions: AssistantAction[];
  warnings: string[];
}

export interface AssistantRouteResponse {
  reply: string;
  actions: AssistantAction[];
  applied: AssistantAction[];
  needsConfirmation: AssistantAction[];
  warnings: string[];
  updatedEntities: Partial<WorkspaceSnapshot>;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface UserProfile {
  id: UUID;
  email: string | null;
  full_name: string | null;
  timezone: string | null;
  created_at?: string;
}

export interface ExportedWorkspace {
  version: 1;
  exportedAt: string;
  workspace: WorkspaceSnapshot;
}
