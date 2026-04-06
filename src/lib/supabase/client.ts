import { createBrowserClient } from "@supabase/ssr";

import { getBrowserEnv, hasSupabaseBrowserEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabaseClient() {
  if (!hasSupabaseBrowserEnv) {
    return null;
  }

  if (!browserClient) {
    const env = getBrowserEnv();
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }

  return browserClient;
}
