import { addDays, format, nextDay, parse, startOfDay } from "date-fns";

import { getServerEnv, hasOpenAiServerEnv } from "@/lib/env";
import { assistantReplySchema } from "@/lib/schema";
import type { AssistantReply, AssistantAction, WorkspaceSnapshot } from "@/lib/types";
import { generateId } from "@/lib/utils";

const weekdayIndex: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const assistantJsonSchema = {
  name: "cosmic_assistant_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "actions", "warnings"],
    properties: {
      reply: { type: "string" },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
      actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "operation",
            "entityType",
            "targetId",
            "reason",
            "safety",
            "payload",
          ],
          properties: {
            id: { type: "string" },
            operation: {
              type: "string",
              enum: ["create", "update", "delete", "optimize_schedule"],
            },
            entityType: {
              type: "string",
              enum: ["event", "task", "note", "goal"],
            },
            targetId: {
              anyOf: [{ type: "string" }, { type: "null" }],
            },
            applyScope: {
              type: "string",
              enum: ["instance", "series"],
            },
            reason: { type: "string" },
            safety: {
              type: "string",
              enum: ["low", "review"],
            },
            payload: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
    },
  },
} as const;

function summarizeWorkspace(workspace: WorkspaceSnapshot) {
  return {
    categories: workspace.categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
    })),
    upcomingEvents: workspace.events.slice(0, 20).map((event) => ({
      id: event.id,
      title: event.title,
      start_at: event.start_at,
      end_at: event.end_at,
      recurrence_rule_id: event.recurrence_rule_id,
    })),
    openTasks: workspace.tasks
      .filter((task) => !task.completed)
      .slice(0, 20)
      .map((task) => ({
        id: task.id,
        title: task.title,
        due_at: task.due_at,
      })),
    notes: workspace.notes.slice(0, 10).map((note) => ({
      id: note.id,
      title: note.title,
      tags: note.tags,
    })),
    goals: workspace.goals.slice(0, 10).map((goal) => ({
      id: goal.id,
      title: goal.title,
      progress: goal.progress,
      horizon: goal.horizon,
    })),
  };
}

function parseTimeText(value: string, baseDate: Date) {
  const parsed = parse(value.toUpperCase(), "h:mma", baseDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return parse(value.toUpperCase(), "ha", baseDate);
}

function createSimpleAction(
  partial: Omit<AssistantAction, "id">,
): AssistantAction {
  return {
    id: generateId(),
    ...partial,
  };
}

function heuristicAssistantReply(params: {
  message: string;
  selectedDate: string;
  timezone: string;
  workspace: WorkspaceSnapshot;
}): AssistantReply {
  const lower = params.message.toLowerCase();
  const baseDay = startOfDay(new Date(`${params.selectedDate}T00:00:00`));
  const actions: AssistantAction[] = [];

  const recurringMatch = lower.match(
    /(?:schedule|add|create)\s+(.+?)\s+every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/,
  );
  if (recurringMatch) {
    const [, title, weekday, timeText] = recurringMatch;
    const nextDate = nextDay(
      baseDay,
      weekdayIndex[weekday] as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    );
    const start = parseTimeText(timeText, nextDate);
    const end = addDays(start, 0);
    end.setHours(start.getHours() + 1);
    actions.push(
      createSimpleAction({
        operation: "create",
        entityType: "event",
        targetId: null,
        reason: "Create the recurring event you requested.",
        safety: "low",
        payload: {
          title,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          timezone: params.timezone,
          reminder_offsets: [10],
          recurrence: {
            frequency: "WEEKLY",
            interval: 1,
            byWeekday: [weekdayIndex[weekday]],
            until: null,
          },
        },
      }),
    );
    return {
      reply: `I drafted "${title}" as a recurring weekly event.`,
      actions,
      warnings: ["OpenAI is not configured, so this came from the local fallback parser."],
    };
  }

  const simpleScheduleMatch = lower.match(
    /(?:schedule|add|create)\s+(.+?)\s+(today|tomorrow)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/,
  );
  if (simpleScheduleMatch) {
    const [, title, dayWord, timeText] = simpleScheduleMatch;
    const targetDay = dayWord === "tomorrow" ? addDays(baseDay, 1) : baseDay;
    const start = parseTimeText(timeText, targetDay);
    const end = new Date(start.getTime() + 60 * 60_000);
    actions.push(
      createSimpleAction({
        operation: "create",
        entityType: "event",
        targetId: null,
        reason: "Create the event you requested.",
        safety: "low",
        payload: {
          title,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          timezone: params.timezone,
          reminder_offsets: [10],
        },
      }),
    );
    return {
      reply: `I drafted "${title}" for ${format(targetDay, "EEEE")} at ${timeText}.`,
      actions,
      warnings: ["OpenAI is not configured, so this came from the local fallback parser."],
    };
  }

  const deleteMatch = lower.match(/(?:delete|remove|cancel)\s+(.+)/);
  if (deleteMatch) {
    const target = params.workspace.events.find((event) =>
      event.title.toLowerCase().includes(deleteMatch[1].trim()),
    );
    if (target) {
      return {
        reply: `I found "${target.title}" and prepared its deletion for confirmation.`,
        actions: [
          createSimpleAction({
            operation: "delete",
            entityType: "event",
            targetId: target.id,
            reason: "Delete the matching event.",
            safety: "review",
            payload: {},
          }),
        ],
        warnings: ["OpenAI is not configured, so matching used simple title search."],
      };
    }
  }

  const completeMatch = lower.match(/(?:complete|finish|done)\s+(.+)/);
  if (completeMatch) {
    const target = params.workspace.tasks.find((task) =>
      task.title.toLowerCase().includes(completeMatch[1].trim()),
    );
    if (target) {
      return {
        reply: `I marked "${target.title}" as complete.`,
        actions: [
          createSimpleAction({
            operation: "update",
            entityType: "task",
            targetId: target.id,
            reason: "Mark the matching task complete.",
            safety: "low",
            payload: {
              completed: true,
              title: target.title,
            },
          }),
        ],
        warnings: ["OpenAI is not configured, so matching used simple title search."],
      };
    }
  }

  return {
    reply:
      "I need OpenAI configured for broader requests. Manual planning still works, and the fallback parser handles a few common scheduling commands.",
    actions: [],
    warnings: ["Configure OPENAI_API_KEY to unlock the full assistant."],
  };
}

export async function generateAssistantReply(params: {
  message: string;
  selectedDate: string;
  timezone: string;
  workspace: WorkspaceSnapshot;
}) {
  if (!hasOpenAiServerEnv()) {
    return heuristicAssistantReply(params);
  }

  const env = getServerEnv();
  const systemPrompt = [
    "You are Cosmic, a calm but decisive executive assistant for calendar and productivity workflows.",
    "Return only the structured response. Use actions for concrete mutations.",
    "Prefer precise event/task/note/goal actions. Use optimize_schedule only when the user explicitly asks for schedule optimization or a multi-step plan.",
    "Set safety to review for deletes, recurring-series edits, bulk changes, and schedule optimization.",
    "Set safety to low for creates and straightforward single-item updates.",
    `Assume current selected date is ${params.selectedDate} in timezone ${params.timezone}.`,
  ].join(" ");

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openAiModel,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: assistantJsonSchema,
      },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify({
            message: params.message,
            workspace: summarizeWorkspace(params.workspace),
          }),
        },
      ],
    }),
  });

  if (!openAiResponse.ok) {
    return heuristicAssistantReply(params);
  }

  const payload = (await openAiResponse.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return heuristicAssistantReply(params);
  }

  return assistantReplySchema.parse(JSON.parse(content));
}
