import { addHours, addMinutes, startOfDay } from "date-fns";

import type {
  Category,
  EventRecurrenceRule,
  EventRecord,
  Goal,
  Note,
  Reminder,
  Task,
  WorkspaceSnapshot,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

const today = startOfDay(new Date());
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const categories: Category[] = [
  { id: "cat-work", user_id: null, name: "Work", color: "#78f3c6" },
  { id: "cat-health", user_id: null, name: "Health", color: "#8aa8ff" },
  { id: "cat-focus", user_id: null, name: "Focus", color: "#ffc987" },
  { id: "cat-personal", user_id: null, name: "Personal", color: "#ff95d4" },
];

const events: EventRecord[] = [
  {
    id: "evt-standup",
    user_id: null,
    title: "Daily alignment",
    description: "Top priorities and blockers.",
    location: "Studio",
    category_id: "cat-work",
    start_at: addHours(today, 9).toISOString(),
    end_at: addHours(today, 9.5).toISOString(),
    timezone,
    reminder_offsets: [10],
    color: "#78f3c6",
    recurrence_rule_id: "rrule-standup",
  },
  {
    id: "evt-deep-work",
    user_id: null,
    title: "Deep work block",
    description: "Build the highest-leverage slice first.",
    location: "",
    category_id: "cat-focus",
    start_at: addHours(today, 10).toISOString(),
    end_at: addHours(today, 12).toISOString(),
    timezone,
    reminder_offsets: [15],
    color: "#ffc987",
    recurrence_rule_id: null,
  },
  {
    id: "evt-gym",
    user_id: null,
    title: "Strength training",
    description: "Upper body and mobility finish.",
    location: "Gym",
    category_id: "cat-health",
    start_at: addHours(today, 18).toISOString(),
    end_at: addHours(today, 19).toISOString(),
    timezone,
    reminder_offsets: [30],
    color: "#8aa8ff",
    recurrence_rule_id: "rrule-gym",
  },
];

const eventRecurrenceRules: EventRecurrenceRule[] = [
  {
    id: "rrule-standup",
    user_id: null,
    event_id: "evt-standup",
    rrule: "FREQ=DAILY;INTERVAL=1",
    timezone,
    exdates: [],
  },
  {
    id: "rrule-gym",
    user_id: null,
    event_id: "evt-gym",
    rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    timezone,
    exdates: [],
  },
];

const tasks: Task[] = [
  {
    id: "tsk-priorities",
    user_id: null,
    title: "Ship onboarding polish",
    description: "Tighten the first-run experience and status copy.",
    completed: false,
    due_at: addHours(today, 17).toISOString(),
    linked_event_id: "evt-deep-work",
    category_id: "cat-work",
    priority: "high",
    reminder_at: addHours(today, 16).toISOString(),
  },
  {
    id: "tsk-groceries",
    user_id: null,
    title: "Plan groceries",
    description: "Protein, fruit, mineral water.",
    completed: false,
    due_at: addHours(today, 20).toISOString(),
    linked_event_id: null,
    category_id: "cat-personal",
    priority: "medium",
    reminder_at: null,
  },
];

const notes: Note[] = [
  {
    id: "note-wins",
    user_id: null,
    title: "What helps my best days",
    content:
      "Start with one intentional block, protect noon reset, leave admin for late afternoon.",
    tags: ["energy", "systems"],
    pinned: true,
    search_text: "what helps my best days energy systems",
  },
  {
    id: "note-ideas",
    user_id: null,
    title: "Small leverage ideas",
    content:
      "Template repetitive replies, cluster errands, pre-decide tomorrow's first task.",
    tags: ["ideas"],
    pinned: false,
    search_text: "small leverage ideas template repetitive replies cluster errands",
  },
];

const goals: Goal[] = [
  {
    id: "goal-launch",
    user_id: null,
    title: "Launch Cosmic alpha",
    description: "Ship the calmest day planner in the browser.",
    horizon: "short",
    progress: 68,
    target_date: addHours(today, 24 * 20).toISOString(),
    category_id: "cat-work",
    linked_task_ids: ["tsk-priorities"],
  },
  {
    id: "goal-fitness",
    user_id: null,
    title: "Train 4x weekly",
    description: "Protect consistency more than intensity.",
    horizon: "long",
    progress: 44,
    target_date: null,
    category_id: "cat-health",
    linked_task_ids: [],
  },
];

const reminders: Reminder[] = [
  {
    id: generateId(),
    user_id: null,
    entity_type: "event",
    entity_id: "evt-deep-work",
    due_at: addMinutes(addHours(today, 10), -15).toISOString(),
    title: "Deep work starts soon",
    body: "Protect your next block and clear distractions.",
    sent_at: null,
    meta: {},
  },
];

export const demoWorkspace: WorkspaceSnapshot = {
  categories,
  events,
  eventRecurrenceRules,
  eventOverrides: [],
  tasks,
  notes,
  goals,
  reminders,
  pushSubscriptions: [],
};

export const defaultCategories = categories;
