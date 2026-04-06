"use client";

import { useRef } from "react";
import { BellRing, CalendarDays, CloudDownload, LogOut, Upload } from "lucide-react";

import { enablePushNotifications } from "@/lib/client/push-actions";
import { importWorkspace } from "@/lib/client/workspace-actions";
import { serializeWorkspace } from "@/lib/export";
import { downloadFile } from "@/lib/utils";
import { snapshotFromState, useCosmicStore } from "@/store/cosmic-store";
import { Button, SectionCard } from "@/components/shared/ui";
import { workspaceImportSchema } from "@/lib/schema";

export function SettingsPanel() {
  const mode = useCosmicStore((state) => state.mode);
  const syncMessage = useCosmicStore((state) => state.syncMessage);
  const reminderPermission = useCosmicStore((state) => state.reminderPermission);
  const signOut = useCosmicStore((state) => state.signOut);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <SectionCard
      title="Settings"
      description="Notifications, portability, and deployment readiness."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Environment status</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {mode === "authenticated"
              ? "Live mode connected to Supabase."
              : mode === "demo"
                ? "Demo mode is running entirely in the browser."
                : "Waiting for sign-in."}
          </p>
          {syncMessage ? (
            <p className="mt-2 text-xs text-[var(--muted)]">{syncMessage}</p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Reminder delivery</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Permission: {reminderPermission}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              void enablePushNotifications();
            }}
          >
            <BellRing className="mr-2 h-4 w-4" />
            Enable notifications
          </Button>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Export workspace</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Download all Cosmic data as JSON for backup or migration.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              const exportWorkspace = snapshotFromState(useCosmicStore.getState());
              return (
              downloadFile(
                `cosmic-export-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(serializeWorkspace(exportWorkspace), null, 2),
                "application/json",
              )
              );
            }}
          >
            <CloudDownload className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          {mode === "authenticated" ? (
            <Button
              className="mt-3"
              variant="ghost"
              onClick={() => {
                window.location.href = "/api/export/ics";
              }}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Export ICS
            </Button>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Import workspace</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Restore a previous export into the current workspace.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              void file.text().then((text) => {
                const parsed = workspaceImportSchema.parse(JSON.parse(text));
                return importWorkspace(parsed.workspace);
              });
            }}
          />
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import JSON
          </Button>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Session</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign out of the current browser session.
          </p>
          <Button className="mt-4" variant="ghost" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
