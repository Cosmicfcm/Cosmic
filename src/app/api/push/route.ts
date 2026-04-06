import { NextResponse } from "next/server";

import { pushSubscriptionSchema } from "@/lib/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils";

export async function POST(request: Request) {
  const payload = pushSubscriptionSchema.parse(await request.json());
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await supabase.from("push_subscriptions").upsert({
    id: generateId(),
    user_id: user.id,
    endpoint: payload.endpoint,
    p256dh: payload.keys.p256dh,
    auth: payload.keys.auth,
    expiration_time: payload.expirationTime ?? null,
  });

  return NextResponse.json({ ok: true });
}
