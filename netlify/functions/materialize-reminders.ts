import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "../../src/lib/env";
import { refreshUserReminders } from "../../src/lib/server/reminder-jobs";

export default async function handler() {
  const env = getServerEnv();
  const client = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await client
    .from("push_subscriptions")
    .select("user_id")
    .neq("user_id", "");

  const userIds = Array.from(
    new Set((data ?? []).map((row) => row.user_id).filter(Boolean)),
  ) as string[];

  for (const userId of userIds) {
    await refreshUserReminders(client, userId);
  }

  return new Response(JSON.stringify({ ok: true, users: userIds.length }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const config: Config = {
  schedule: "0 2 * * *",
};
