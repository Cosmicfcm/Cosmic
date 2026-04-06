"use client";

import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

import {
  confirmAssistantActions,
  sendAssistantMessage,
} from "@/lib/client/assistant-actions";
import { useCosmicStore } from "@/store/cosmic-store";
import { Button, Textarea } from "@/components/shared/ui";
import { cn } from "@/lib/utils";

export function AssistantDrawer() {
  const [message, setMessage] = useState("");
  const assistantOpen = useCosmicStore((state) => state.assistantOpen);
  const setAssistantOpen = useCosmicStore((state) => state.setAssistantOpen);
  const assistantMessages = useCosmicStore((state) => state.assistantMessages);
  const assistantBusy = useCosmicStore((state) => state.assistantBusy);
  const pendingActions = useCosmicStore((state) => state.assistantPendingActions);
  const warnings = useCosmicStore((state) => state.assistantWarnings);

  return (
    <aside
      className={cn(
        "glass-panel fixed bottom-4 right-4 top-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-[30px] p-5 transition-transform duration-300",
        assistantOpen ? "translate-x-0" : "translate-x-[110%]",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-slate-950">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Cosmic assistant</p>
            <p className="text-xs text-[var(--muted)]">
              Schedule, move, and tune the day
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setAssistantOpen(false)}>
          Close
        </Button>
      </div>

      <div className="flex h-[calc(100%-76px)] flex-col">
        <div className="flex-1 space-y-3 overflow-auto pr-1">
          {assistantMessages.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-3xl px-4 py-3 text-sm leading-6",
                item.role === "assistant"
                  ? "bg-white/[0.05] text-white"
                  : "bg-[var(--accent-soft)] text-white",
              )}
            >
              {item.content}
            </div>
          ))}

          {warnings.length > 0 ? (
            <div className="rounded-3xl border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning)]">
              {warnings.join(" ")}
            </div>
          ) : null}

          {pendingActions.length > 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Review required
              </div>
              <div className="space-y-2">
                {pendingActions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-[var(--muted)]"
                  >
                    <div className="font-medium capitalize text-white">
                      {action.operation} {action.entityType}
                    </div>
                    <p className="mt-1">{action.reason}</p>
                  </div>
                ))}
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  void confirmAssistantActions();
                }}
              >
                Apply reviewed changes
              </Button>
            </div>
          ) : null}
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const next = message;
            setMessage("");
            void sendAssistantMessage(next);
          }}
        >
          <Textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder='Try "Schedule gym every Monday at 7am" or "make tomorrow more productive".'
          />
          <Button type="submit" className="w-full" onClick={undefined}>
            <Send className="mr-2 h-4 w-4" />
            {assistantBusy ? "Working..." : "Send"}
          </Button>
        </form>
      </div>
    </aside>
  );
}
