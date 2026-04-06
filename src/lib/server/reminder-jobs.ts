import { addDays } from "date-fns";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

import { materializeEventReminders, materializeTaskReminders } from "@/lib/reminders";
import { getServerEnv } from "@/lib/env";

export async function refreshUserReminders(
  client: SupabaseClient,
  userId: string,
) {
  const [eventsResult, rulesResult, overridesResult, tasksResult] = await Promise.all([
    client.from("events").select("*").eq("user_id", userId).order("start_at"),
    client
      .from("event_recurrence_rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at"),
    client
      .from("event_overrides")
      .select("*")
      .eq("user_id", userId)
      .order("occurrence_date"),
    client.from("tasks").select("*").eq("user_id", userId),
  ]);

  const now = new Date();
  const reminders = [
    ...materializeEventReminders({
      events: eventsResult.data ?? [],
      rules: rulesResult.data ?? [],
      overrides: overridesResult.data ?? [],
      userId,
      windowStart: now,
      windowEnd: addDays(now, 14),
    }),
    ...materializeTaskReminders(tasksResult.data ?? [], userId).filter(
      (reminder) => new Date(reminder.due_at) >= now,
    ),
  ];

  await client
    .from("reminders")
    .delete()
    .eq("user_id", userId)
    .gte("due_at", now.toISOString());

  if (reminders.length > 0) {
    await client.from("reminders").insert(reminders);
  }
}

export async function sendDueReminders(client: SupabaseClient) {
  const now = new Date().toISOString();
  const env = getServerEnv();
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);

  const [remindersResult, subscriptionsResult] = await Promise.all([
    client
      .from("reminders")
      .select("*")
      .is("sent_at", null)
      .lte("due_at", now),
    client.from("push_subscriptions").select("*"),
  ]);

  const reminders = remindersResult.data ?? [];
  const subscriptionsByUser = new Map<string, typeof subscriptionsResult.data>();

  for (const subscription of subscriptionsResult.data ?? []) {
    const list = subscriptionsByUser.get(subscription.user_id) ?? [];
    list.push(subscription);
    subscriptionsByUser.set(subscription.user_id, list);
  }

  for (const reminder of reminders) {
    const subscriptions = subscriptionsByUser.get(reminder.user_id ?? "") ?? [];
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            title: reminder.title,
            body: reminder.body,
            data: reminder.meta,
          }),
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await client
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", subscription.endpoint);
        }
      }
    }
  }

  if (reminders.length > 0) {
    await client
      .from("reminders")
      .update({ sent_at: new Date().toISOString() })
      .in(
        "id",
        reminders.map((reminder) => reminder.id),
      );
  }
}
