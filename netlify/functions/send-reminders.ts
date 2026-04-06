import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "../../src/lib/env";
import { sendDueReminders } from "../../src/lib/server/reminder-jobs";

export default async function handler() {
  const env = getServerEnv();
  const client = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await sendDueReminders(client);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const config: Config = {
  schedule: "* * * * *",
};
