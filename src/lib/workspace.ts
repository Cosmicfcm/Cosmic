import type { Session } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { defaultCategories, demoWorkspace } from "@/lib/demo-data";
import { getBrowserEnv } from "@/lib/env";
import { workspaceImportSchema } from "@/lib/schema";
import type {
  Category,
  EventOverride,
  EventRecurrenceRule,
  EventRecord,
  ExportedWorkspace,
  Goal,
  Note,
  PushSubscriptionRecord,
  Reminder,
  Task,
  UserProfile,
  WorkspaceSnapshot,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

const DEMO_STORAGE_KEY = "cosmic-demo-workspace";

function cloneDemoWorkspace(): WorkspaceSnapshot {
  return JSON.parse(JSON.stringify(demoWorkspace)) as WorkspaceSnapshot;
}

function loadDemoWorkspaceFromStorage(): WorkspaceSnapshot {
  if (typeof window === "undefined") {
    return cloneDemoWorkspace();
  }

  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) {
    return cloneDemoWorkspace();
  }

  try {
    const parsed = workspaceImportSchema.parse(JSON.parse(raw));
    return parsed.workspace;
  } catch {
    return cloneDemoWorkspace();
  }
}

export function saveDemoWorkspace(workspace: WorkspaceSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: ExportedWorkspace = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace,
  };

  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(payload));
}

async function ensureDefaultCategories(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("categories").select("id").limit(1);
  if (error || (data?.length ?? 0) > 0) {
    return;
  }

  await client.from("categories").insert(
    defaultCategories.map((category) => ({
      id: generateId(),
      user_id: userId,
      name: category.name,
      color: category.color,
      icon: category.icon ?? null,
    })),
  );
}

export async function loadWorkspace(
  client: SupabaseClient | null,
  session: Session | null,
): Promise<{
  workspace: WorkspaceSnapshot;
  profile: UserProfile | null;
  mode: "demo" | "authenticated";
}> {
  if (!client || !session) {
    return {
      workspace: loadDemoWorkspaceFromStorage(),
      profile: {
        id: "demo-user",
        email: "demo@cosmic.local",
        full_name: "Demo user",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      mode: "demo",
    };
  }

  await ensureDefaultCategories(client, session.user.id);

  const [
    profileResult,
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
    client.from("profiles").select("*").maybeSingle(),
    client.from("categories").select("*").order("name"),
    client.from("events").select("*").order("start_at"),
    client.from("event_recurrence_rules").select("*").order("created_at"),
    client.from("event_overrides").select("*").order("occurrence_date"),
    client.from("tasks").select("*").order("created_at", { ascending: false }),
    client.from("notes").select("*").order("updated_at", { ascending: false }),
    client.from("goals").select("*").order("created_at", { ascending: false }),
    client.from("reminders").select("*").order("due_at").limit(200),
    client.from("push_subscriptions").select("*"),
  ]);

  return {
    workspace: {
      categories: (categoriesResult.data ?? []) as Category[],
      events: (eventsResult.data ?? []) as EventRecord[],
      eventRecurrenceRules: (rulesResult.data ?? []) as EventRecurrenceRule[],
      eventOverrides: (overridesResult.data ?? []) as EventOverride[],
      tasks: (tasksResult.data ?? []) as Task[],
      notes: (notesResult.data ?? []) as Note[],
      goals: (goalsResult.data ?? []) as Goal[],
      reminders: (remindersResult.data ?? []) as Reminder[],
      pushSubscriptions:
        (subscriptionsResult.data ?? []) as PushSubscriptionRecord[],
    },
    profile: (profileResult.data as UserProfile | null) ?? {
      id: session.user.id,
      email: session.user.email ?? null,
      full_name: session.user.user_metadata.full_name ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    mode: "authenticated",
  };
}

export function getAuthRedirectUrl() {
  return `${getBrowserEnv().siteUrl}/auth/callback`;
}
