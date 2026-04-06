import { NextResponse } from "next/server";
import ical from "ical-generator";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadWorkspaceSnapshotForUser } from "@/lib/server/assistant-workspace";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await loadWorkspaceSnapshotForUser(supabase);
  const calendar = ical({
    name: "Cosmic Calendar",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  for (const event of workspace.events) {
    calendar.createEvent({
      id: event.id,
      start: new Date(event.start_at),
      end: new Date(event.end_at),
      summary: event.title,
      description: event.description,
      location: event.location,
    });
  }

  return new NextResponse(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cosmic-calendar.ics"',
    },
  });
}
