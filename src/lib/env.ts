const browserEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.URL ??
    "http://localhost:3000",
};

export const hasSupabaseBrowserEnv = Boolean(
  browserEnv.supabaseUrl && browserEnv.supabaseAnonKey,
);

export function getBrowserEnv() {
  return browserEnv;
}

export function getServerEnv() {
  return {
    ...browserEnv,
    openAiApiKey: process.env.OPENAI_API_KEY ?? "",
    openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    vapidSubject:
      process.env.VAPID_SUBJECT ?? "mailto:cosmic@example.com",
  };
}

export function hasOpenAiServerEnv() {
  return Boolean(getServerEnv().openAiApiKey);
}

export function hasReminderServerEnv() {
  const env = getServerEnv();
  return Boolean(
    env.supabaseUrl &&
      env.serviceRoleKey &&
      env.vapidPrivateKey &&
      env.vapidPublicKey,
  );
}
