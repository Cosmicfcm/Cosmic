import { getUserTimezone } from "@/lib/date";
import { assistantActionSchema } from "@/lib/schema";
import type { AssistantRouteResponse } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { snapshotFromState, useCosmicStore } from "@/store/cosmic-store";

function applyAssistantResponse(payload: AssistantRouteResponse, responseOk: boolean) {
  const state = useCosmicStore.getState();
  state.setAssistantBusy(false);
  state.pushAssistantMessage({
    id: generateId(),
    role: "assistant",
    content: payload.reply,
    createdAt: new Date().toISOString(),
  });
  state.setAssistantPendingActions(payload.needsConfirmation);
  state.setAssistantWarnings(payload.warnings);
  state.setWorkspace(payload.updatedEntities);
  state.setError(responseOk ? null : payload.reply);
}

export async function sendAssistantMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }

  const state = useCosmicStore.getState();
  state.setAssistantBusy(true);
  state.pushAssistantMessage({
    id: generateId(),
    role: "user",
    content: trimmed,
    createdAt: new Date().toISOString(),
  });
  state.setAssistantWarnings([]);

  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: trimmed,
      selectedDate: state.selectedDate,
      timezone: getUserTimezone(),
      context: {
        section: state.currentSection,
        ...(state.mode === "demo"
          ? {
              workspace: snapshotFromState(state),
            }
          : {}),
      },
    }),
  });

  const payload = (await response.json()) as AssistantRouteResponse;
  applyAssistantResponse(payload, response.ok);
}

export async function confirmAssistantActions() {
  const state = useCosmicStore.getState();
  if (state.assistantPendingActions.length === 0) {
    return;
  }

  state.setAssistantBusy(true);

  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      confirmedActions: state.assistantPendingActions.map((action) =>
        assistantActionSchema.parse(action),
      ),
      selectedDate: state.selectedDate,
      timezone: getUserTimezone(),
      context:
        state.mode === "demo"
          ? {
              workspace: snapshotFromState(state),
            }
          : undefined,
    }),
  });

  const payload = (await response.json()) as AssistantRouteResponse;
  applyAssistantResponse(payload, response.ok);
}
