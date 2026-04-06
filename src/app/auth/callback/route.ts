import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = new URL("/", url.origin);

  if (!code) {
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(redirectTo);
}
