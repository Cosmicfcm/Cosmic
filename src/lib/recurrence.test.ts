import { addHours, startOfDay } from "date-fns";

import { expandEventOccurrences } from "@/lib/recurrence";
import type { EventOverride, EventRecurrenceRule, EventRecord } from "@/lib/types";

describe("expandEventOccurrences", () => {
  it("expands a weekly recurrence and applies instance overrides", () => {
    const today = startOfDay(new Date("2026-04-06T00:00:00.000Z"));
    const events: EventRecord[] = [
      {
        id: "event-1",
        user_id: null,
        title: "Gym",
        description: "",
        location: "",
        category_id: null,
        start_at: addHours(today, 7).toISOString(),
        end_at: addHours(today, 8).toISOString(),
        timezone: "UTC",
        reminder_offsets: [10],
        color: null,
        recurrence_rule_id: "rule-1",
      },
    ];
    const rules: EventRecurrenceRule[] = [
      {
        id: "rule-1",
        user_id: null,
        event_id: "event-1",
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE",
        timezone: "UTC",
        exdates: [],
      },
    ];
    const overrides: EventOverride[] = [
      {
        id: "override-1",
        user_id: null,
        event_id: "event-1",
        occurrence_date: "2026-04-08",
        is_cancelled: false,
        title: "Gym + sauna",
        description: null,
        location: null,
        start_at: addHours(startOfDay(new Date("2026-04-08T00:00:00.000Z")), 8).toISOString(),
        end_at: addHours(startOfDay(new Date("2026-04-08T00:00:00.000Z")), 9).toISOString(),
        category_id: null,
        color: null,
      },
    ];

    const occurrences = expandEventOccurrences({
      events,
      rules,
      overrides,
      rangeStart: new Date("2026-04-06T00:00:00.000Z"),
      rangeEnd: new Date("2026-04-10T23:59:59.000Z"),
    });

    expect(occurrences).toHaveLength(2);
    expect(occurrences[1]?.title).toBe("Gym + sauna");
    expect(occurrences[1]?.start_at).toBe(overrides[0]?.start_at);
  });
});
