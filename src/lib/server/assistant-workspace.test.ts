import { applyActionsToWorkspace, isLowRiskAction } from "@/lib/server/assistant-workspace";
import { demoWorkspace } from "@/lib/demo-data";
import type { AssistantAction } from "@/lib/types";

describe("applyActionsToWorkspace", () => {
  it("creates a task and materializes its reminder", () => {
    const action: AssistantAction = {
      id: "action-1",
      operation: "create",
      entityType: "task",
      targetId: null,
      reason: "Create a task",
      safety: "low",
      payload: {
        title: "Write weekly review",
        description: "Capture the week cleanly.",
        reminder_at: "2026-04-07T16:00:00.000Z",
      },
    };

    const updated = applyActionsToWorkspace({
      workspace: demoWorkspace,
      actions: [action],
      userId: "user-1",
    });

    expect(updated.tasks.some((task) => task.title === "Write weekly review")).toBe(true);
    expect(updated.reminders.some((reminder) => reminder.entity_type === "task")).toBe(true);
    expect(isLowRiskAction(action, demoWorkspace)).toBe(true);
  });
});
