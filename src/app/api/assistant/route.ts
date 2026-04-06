import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateAssistantReply } from "@/lib/server/assistant-model";
import {
  applyActionsToWorkspace,
  isLowRiskAction,
  loadWorkspaceSnapshotForUser,
  persistWorkspaceSnapshot,
} from "@/lib/server/assistant-workspace";
import { assistantRequestSchema, workspaceImportSchema } from "@/lib/schema";
import type { WorkspaceSnapshot } from "@/lib/types";

function parseContextWorkspace(value: unknown): WorkspaceSnapshot | null {
  if (!value || typeof value !== "object" || !("workspace" in value)) {
    return null;
  }

  const parsed = workspaceImportSchema.safeParse({
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace: (value as { workspace: unknown }).workspace,
  });

  return parsed.success ? parsed.data.workspace : null;
}

export async function POST(request: Request) {
  try {
    const body = assistantRequestSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const workspace =
      user !== null
        ? await loadWorkspaceSnapshotForUser(supabase)
        : parseContextWorkspace(body.context) ?? null;

    if (!workspace) {
      return NextResponse.json(
        {
          reply:
            "Connect Supabase or run in demo mode before using the assistant.",
          actions: [],
          applied: [],
          needsConfirmation: [],
          warnings: ["No workspace context was available for the assistant."],
          updatedEntities: {},
        },
        { status: 400 },
      );
    }

    if (body.confirmedActions && body.confirmedActions.length > 0) {
      const updatedWorkspace = applyActionsToWorkspace({
        workspace,
        actions: body.confirmedActions,
        userId: user?.id ?? null,
      });

      if (user) {
        await persistWorkspaceSnapshot(supabase, updatedWorkspace);
      }

      return NextResponse.json({
        reply: "I applied the reviewed changes.",
        actions: body.confirmedActions,
        applied: body.confirmedActions,
        needsConfirmation: [],
        warnings: [],
        updatedEntities: updatedWorkspace,
      });
    }

    const assistantReply = await generateAssistantReply({
      message: body.message ?? "",
      selectedDate: body.selectedDate ?? new Date().toISOString().slice(0, 10),
      timezone: body.timezone ?? "UTC",
      workspace,
    });

    const autoApplyActions = assistantReply.actions.filter(
      (action) => action.safety === "low" && isLowRiskAction(action, workspace),
    );
    const needsConfirmation = assistantReply.actions.filter(
      (action) => !autoApplyActions.some((candidate) => candidate.id === action.id),
    );

    const updatedWorkspace =
      autoApplyActions.length > 0
        ? applyActionsToWorkspace({
            workspace,
            actions: autoApplyActions,
            userId: user?.id ?? null,
          })
        : workspace;

    if (user && autoApplyActions.length > 0) {
      await persistWorkspaceSnapshot(supabase, updatedWorkspace);
    }

    return NextResponse.json({
      reply: assistantReply.reply,
      actions: assistantReply.actions,
      applied: autoApplyActions,
      needsConfirmation,
      warnings: assistantReply.warnings,
      updatedEntities:
        autoApplyActions.length > 0 ? updatedWorkspace : ({} as WorkspaceSnapshot),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Assistant request failed.";

    return NextResponse.json(
      {
        reply: message,
        actions: [],
        applied: [],
        needsConfirmation: [],
        warnings: ["The assistant could not complete that request."],
        updatedEntities: {},
      },
      { status: 500 },
    );
  }
}
