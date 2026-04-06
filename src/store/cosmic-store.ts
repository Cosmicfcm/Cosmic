import { useMemo } from "react";
import { addMinutes, parseISO, setHours, setMinutes, startOfToday } from "date-fns";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getUserTimezone, toIsoDate, toIsoDateTimeInput } from "@/lib/date";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { expandEventOccurrences } from "@/lib/recurrence";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl, loadWorkspace } from "@/lib/workspace";
import type {
  AssistantAction,
  AssistantMessage,
  EventDraft,
  GoalDraft,
  NoteDraft,
  TaskDraft,
  UserProfile,
  WorkspaceSection,
  WorkspaceSnapshot,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

type AppMode = "loading" | "demo" | "signed-out" | "authenticated";

interface EditorState<TDraft> {
  open: boolean;
  draft: TDraft;
}

export interface CosmicState extends WorkspaceSnapshot {
  mode: AppMode;
  session: Session | null;
  user: UserProfile | null;
  currentSection: WorkspaceSection;
  selectedDate: string;
  activeCategoryId: string | null;
  bootstrapComplete: boolean;
  syncMessage: string | null;
  error: string | null;
  noteSearch: string;
  assistantOpen: boolean;
  assistantBusy: boolean;
  assistantMessages: AssistantMessage[];
  assistantPendingActions: AssistantAction[];
  assistantWarnings: string[];
  reminderPermission: NotificationPermission | "unsupported";
  eventEditor: EditorState<EventDraft>;
  taskEditor: EditorState<TaskDraft>;
  noteEditor: EditorState<NoteDraft>;
  goalEditor: EditorState<GoalDraft>;
  bootstrap: () => Promise<void>;
  enterDemoMode: () => Promise<void>;
  signOut: () => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  setSection: (section: WorkspaceSection) => void;
  setSelectedDate: (value: string) => void;
  setNoteSearch: (value: string) => void;
  setAssistantOpen: (value: boolean) => void;
  setAssistantBusy: (value: boolean) => void;
  setAssistantWarnings: (warnings: string[]) => void;
  pushAssistantMessage: (message: AssistantMessage) => void;
  setAssistantPendingActions: (actions: AssistantAction[]) => void;
  setWorkspace: (workspace: Partial<WorkspaceSnapshot>) => void;
  setMode: (mode: AppMode) => void;
  setError: (error: string | null) => void;
  setSyncMessage: (message: string | null) => void;
  requestNotificationPermission: () => Promise<void>;
  savePushSubscription: (subscription: PushSubscription) => Promise<void>;
  openEventEditor: (draft?: Partial<EventDraft>) => void;
  openTaskEditor: (draft?: Partial<TaskDraft>) => void;
  openNoteEditor: (draft?: Partial<NoteDraft>) => void;
  openGoalEditor: (draft?: Partial<GoalDraft>) => void;
  closeEventEditor: () => void;
  closeTaskEditor: () => void;
  closeNoteEditor: () => void;
  closeGoalEditor: () => void;
}

const initialWorkspace: WorkspaceSnapshot = {
  categories: [],
  events: [],
  eventRecurrenceRules: [],
  eventOverrides: [],
  tasks: [],
  notes: [],
  goals: [],
  reminders: [],
  pushSubscriptions: [],
};

export function createDefaultEventDraft(seed?: Partial<EventDraft>): EventDraft {
  const base = seed?.start_at ? parseISO(seed.start_at) : startOfToday();
  const start = seed?.start_at ?? toIsoDateTimeInput(setMinutes(setHours(base, 9), 0));
  const end = seed?.end_at ?? toIsoDateTimeInput(addMinutes(parseISO(start), 60));

  return {
    title: "",
    description: "",
    location: "",
    category_id: null,
    start_at: start,
    end_at: end,
    timezone: getUserTimezone(),
    reminder_offsets: [10],
    recurrence: {
      enabled: false,
      frequency: "WEEKLY",
      interval: 1,
      byWeekday: [],
      until: null,
      rrule: null,
    },
    ...seed,
  };
}

export function createDefaultTaskDraft(seed?: Partial<TaskDraft>): TaskDraft {
  return {
    title: "",
    description: "",
    due_at: null,
    linked_event_id: null,
    category_id: null,
    priority: "medium",
    reminder_at: null,
    ...seed,
  };
}

export function createDefaultNoteDraft(seed?: Partial<NoteDraft>): NoteDraft {
  return {
    title: "",
    content: "",
    tags: [],
    pinned: false,
    ...seed,
  };
}

export function createDefaultGoalDraft(seed?: Partial<GoalDraft>): GoalDraft {
  return {
    title: "",
    description: "",
    horizon: "short",
    progress: 0,
    target_date: null,
    category_id: null,
    linked_task_ids: [],
    ...seed,
  };
}

export const useCosmicStore = create<CosmicState>()(
  persist(
    (set) => ({
      ...initialWorkspace,
      mode: "loading",
      session: null,
      user: null,
      currentSection: "day",
      selectedDate: toIsoDate(new Date()),
      activeCategoryId: null,
      bootstrapComplete: false,
      syncMessage: null,
      error: null,
      noteSearch: "",
      assistantOpen: false,
      assistantBusy: false,
      assistantMessages: [
        {
          id: generateId(),
          role: "assistant",
          content:
            "I can schedule, reschedule, and clean up your day. Ask in plain language.",
          createdAt: new Date().toISOString(),
        },
      ],
      assistantPendingActions: [],
      assistantWarnings: [],
      reminderPermission:
        typeof Notification === "undefined"
          ? "unsupported"
          : Notification.permission,
      eventEditor: { open: false, draft: createDefaultEventDraft() },
      taskEditor: { open: false, draft: createDefaultTaskDraft() },
      noteEditor: { open: false, draft: createDefaultNoteDraft() },
      goalEditor: { open: false, draft: createDefaultGoalDraft() },
      bootstrap: async () => {
        let client = null;

        try {
          client = getBrowserSupabaseClient();
        } catch {
          client = null;
        }

        if (!client) {
          const { workspace, profile, mode } = await loadWorkspace(null, null);
          set({
            ...workspace,
            user: profile,
            mode,
            bootstrapComplete: true,
            error: hasSupabaseBrowserEnv
              ? "Supabase configuration looks invalid. Check your Netlify environment variables."
              : null,
            syncMessage: "Running in demo mode.",
          });
          return;
        }

        try {
          const {
            data: { session },
          } = await client.auth.getSession();

          set({ session });
          client.auth.onAuthStateChange(
            (_event: AuthChangeEvent, nextSession: Session | null) => {
              set({ session: nextSession });
            },
          );

          if (!session) {
            set({
              mode: "signed-out",
              bootstrapComplete: true,
              syncMessage: "Sign in to sync, or explore the demo.",
            });
            return;
          }

          const { workspace, profile, mode } = await loadWorkspace(client, session);
          set({
            ...workspace,
            user: profile,
            mode,
            bootstrapComplete: true,
            syncMessage: "Synced with Supabase.",
          });
        } catch {
          const { workspace, profile, mode } = await loadWorkspace(null, null);
          set({
            ...workspace,
            user: profile,
            mode,
            bootstrapComplete: true,
            error:
              "Supabase could not be reached. Check your Netlify environment variables.",
            syncMessage: "Running in demo mode.",
          });
        }
      },
      enterDemoMode: async () => {
        const { workspace, profile, mode } = await loadWorkspace(null, null);
        set({
          ...workspace,
          user: profile,
          mode,
          bootstrapComplete: true,
          syncMessage: "Running in demo mode.",
        });
      },
      signOut: async () => {
        await getBrowserSupabaseClient()?.auth.signOut();
        set({
          mode: "signed-out",
          session: null,
          user: null,
        });
      },
      requestMagicLink: async (email) => {
        let client = null;

        try {
          client = getBrowserSupabaseClient();
        } catch {
          client = null;
        }

        if (!client) {
          set({
            error: hasSupabaseBrowserEnv
              ? "Supabase configuration looks invalid."
              : "Supabase environment variables are missing.",
          });
          return;
        }

        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });

        set({
          error: error?.message ?? null,
          syncMessage: error
            ? null
            : "Magic link sent. Check your inbox to open Cosmic.",
        });
      },
      setSection: (currentSection) => set({ currentSection }),
      setSelectedDate: (selectedDate) => set({ selectedDate }),
      setNoteSearch: (noteSearch) => set({ noteSearch }),
      setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
      setAssistantBusy: (assistantBusy) => set({ assistantBusy }),
      setAssistantWarnings: (assistantWarnings) => set({ assistantWarnings }),
      pushAssistantMessage: (message) =>
        set((state) => ({
          assistantMessages: [...state.assistantMessages, message],
        })),
      setAssistantPendingActions: (assistantPendingActions) =>
        set({ assistantPendingActions }),
      setWorkspace: (workspace) => set(workspace),
      setMode: (mode) => set({ mode }),
      setError: (error) => set({ error }),
      setSyncMessage: (syncMessage) => set({ syncMessage }),
      requestNotificationPermission: async () => {
        if (typeof window === "undefined" || !("Notification" in window)) {
          set({ reminderPermission: "unsupported" });
          return;
        }
        const permission = await Notification.requestPermission();
        set({ reminderPermission: permission });
      },
      savePushSubscription: async (subscription) => {
        let client = null;

        try {
          client = getBrowserSupabaseClient();
        } catch {
          client = null;
        }

        const state = useCosmicStore.getState();
        if (!client || state.mode !== "authenticated") {
          set({ error: "Push notifications need a signed-in session." });
          return;
        }

        const subscriptionJson = subscription.toJSON();
        if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
          return;
        }

        const record = {
          id: generateId(),
          user_id: state.user?.id ?? null,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
          expiration_time: subscriptionJson.expirationTime ?? null,
        };

        await client.from("push_subscriptions").upsert(record);
        set((current) => ({
          pushSubscriptions: [
            record,
            ...current.pushSubscriptions.filter(
              (item) => item.endpoint !== record.endpoint,
            ),
          ],
          syncMessage: "Browser notifications enabled.",
        }));
      },
      openEventEditor: (draft) =>
        set({ eventEditor: { open: true, draft: createDefaultEventDraft(draft) } }),
      openTaskEditor: (draft) =>
        set({ taskEditor: { open: true, draft: createDefaultTaskDraft(draft) } }),
      openNoteEditor: (draft) =>
        set({ noteEditor: { open: true, draft: createDefaultNoteDraft(draft) } }),
      openGoalEditor: (draft) =>
        set({ goalEditor: { open: true, draft: createDefaultGoalDraft(draft) } }),
      closeEventEditor: () =>
        set({ eventEditor: { open: false, draft: createDefaultEventDraft() } }),
      closeTaskEditor: () =>
        set({ taskEditor: { open: false, draft: createDefaultTaskDraft() } }),
      closeNoteEditor: () =>
        set({ noteEditor: { open: false, draft: createDefaultNoteDraft() } }),
      closeGoalEditor: () =>
        set({ goalEditor: { open: false, draft: createDefaultGoalDraft() } }),
    }),
    {
      name: "cosmic-ui-state",
      partialize: (state) => ({
        selectedDate: state.selectedDate,
        assistantOpen: state.assistantOpen,
      }),
    },
  ),
);

export function snapshotFromState(state: CosmicState): WorkspaceSnapshot {
  return {
    categories: state.categories,
    events: state.events,
    eventRecurrenceRules: state.eventRecurrenceRules,
    eventOverrides: state.eventOverrides,
    tasks: state.tasks,
    notes: state.notes,
    goals: state.goals,
    reminders: state.reminders,
    pushSubscriptions: state.pushSubscriptions,
  };
}

export function useDayOccurrences() {
  const selectedDate = useCosmicStore((state) => state.selectedDate);
  const events = useCosmicStore((state) => state.events);
  const rules = useCosmicStore((state) => state.eventRecurrenceRules);
  const overrides = useCosmicStore((state) => state.eventOverrides);

  return useMemo(
    () =>
    expandEventOccurrences({
        events,
        rules,
        overrides,
        rangeStart: new Date(`${selectedDate}T00:00:00`),
        rangeEnd: new Date(`${selectedDate}T23:59:59`),
      }),
    [events, overrides, rules, selectedDate],
  );
}
