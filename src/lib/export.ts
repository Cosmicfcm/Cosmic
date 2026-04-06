import type { ExportedWorkspace, WorkspaceSnapshot } from "@/lib/types";

export function serializeWorkspace(workspace: WorkspaceSnapshot): ExportedWorkspace {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace,
  };
}
