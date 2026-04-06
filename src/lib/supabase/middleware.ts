import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getBrowserEnv, hasSupabaseBrowserEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseBrowserEnv) {
    return NextResponse.next({
      request,
    });
  }

  const env = getBrowserEnv();
  let response = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    await supabase.auth.getUser();
  } catch {
    return NextResponse.next({
      request,
    });
  }

  return response;
}
