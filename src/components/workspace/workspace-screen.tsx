"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronRight, Sparkles } from "lucide-react";

import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { DayView } from "@/components/calendar/day-view";
import { WorkspaceEditors } from "@/components/editors/workspace-editors";
import { Sidebar } from "@/components/layout/sidebar";
import { GoalsPanel } from "@/components/panels/goals-panel";
import { NotesPanel } from "@/components/panels/notes-panel";
import { SettingsPanel } from "@/components/panels/settings-panel";
import { TasksPanel } from "@/components/panels/tasks-panel";
import { Button, Input, Pill, SectionCard } from "@/components/shared/ui";
import { formatDayLabel, toIsoDate } from "@/lib/date";
import type { WorkspaceSection } from "@/lib/types";
import { useCosmicStore, useDayOccurrences } from "@/store/cosmic-store";

function SignedOutScreen() {
  const [email, setEmail] = useState("");
  const requestMagicLink = useCosmicStore((state) => state.requestMagicLink);
  const enterDemoMode = useCosmicStore((state) => state.enterDemoMode);
  const error = useCosmicStore((state) => state.error);
  const syncMessage = useCosmicStore((state) => state.syncMessage);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
      <div className="glass-panel relative overflow-hidden rounded-[36px] p-10 md:p-14">
        <div className="bg-mesh absolute inset-0 opacity-60" />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Cosmic</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold text-white md:text-6xl">
            Minimal day planning with an AI operator built in.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Calendar, tasks, notes, goals, and reminders in one calm command center.
          </p>

          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void requestMagicLink(email);
            }}
          >
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="sm:min-w-80"
            />
            <Button type="submit">Send magic link</Button>
            <Button variant="secondary" onClick={() => void enterDemoMode()}>
              Explore demo
            </Button>
          </form>

          {syncMessage ? <p className="mt-4 text-sm text-[var(--muted)]">{syncMessage}</p> : null}
          {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}

export function WorkspaceScreen({ section }: { section: WorkspaceSection }) {
  const bootstrap = useCosmicStore((state) => state.bootstrap);
  const bootstrapComplete = useCosmicStore((state) => state.bootstrapComplete);
  const mode = useCosmicStore((state) => state.mode);
  const setSection = useCosmicStore((state) => state.setSection);
  const selectedDate = useCosmicStore((state) => state.selectedDate);
  const setSelectedDate = useCosmicStore((state) => state.setSelectedDate);
  const openEventEditor = useCosmicStore((state) => state.openEventEditor);
  const setAssistantOpen = useCosmicStore((state) => state.setAssistantOpen);
  const syncMessage = useCosmicStore((state) => state.syncMessage);
  const error = useCosmicStore((state) => state.error);
  const user = useCosmicStore((state) => state.user);
  const tasks = useCosmicStore((state) => state.tasks);
  const notes = useCosmicStore((state) => state.notes);
  const goals = useCosmicStore((state) => state.goals);
  const occurrences = useDayOccurrences();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    setSection(section);
  }, [section, setSection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setAssistantOpen(true);
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openEventEditor();
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setSelectedDate(toIsoDate(new Date()));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openEventEditor, setAssistantOpen, setSelectedDate]);

  const stats = useMemo(
    () => [
      { label: "Today events", value: occurrences.length.toString() },
      {
        label: "Open tasks",
        value: tasks.filter((task) => !task.completed).length.toString(),
      },
      { label: "Notes", value: notes.length.toString() },
      { label: "Goals", value: goals.length.toString() },
    ],
    [goals.length, notes.length, occurrences.length, tasks],
  );

  if (!bootstrapComplete || mode === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="glass-panel rounded-full px-6 py-3 text-sm text-[var(--muted)]">
          Loading Cosmic...
        </div>
      </main>
    );
  }

  if (mode === "signed-out") {
    return <SignedOutScreen />;
  }

  const pageContent =
    section === "day" ? (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DayView />
        <div className="space-y-5">
          <TasksPanel />
        </div>
      </div>
    ) : section === "tasks" ? (
      <TasksPanel />
    ) : section === "remember" ? (
      <NotesPanel />
    ) : section === "goals" ? (
      <GoalsPanel />
    ) : (
      <SettingsPanel />
    );

  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <a href="#main-content" className="sr-only sr-only-focusable">
        Skip to content
      </a>
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[280px_1fr]">
        <Sidebar activeSection={section} onAssistantOpen={() => setAssistantOpen(true)} />
        <div id="main-content" className="space-y-5">
          <div className="glass-panel rounded-[30px] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <span>{user?.full_name ?? user?.email ?? "Cosmic user"}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{mode === "demo" ? "Demo mode" : "Synced workspace"}</span>
                </div>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  {formatDayLabel(new Date(`${selectedDate}T00:00:00`))}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Day-first planner
                  </Pill>
                  {syncMessage ? <Pill>{syncMessage}</Pill> : null}
                  {error ? <Pill className="border-[var(--danger)]/20 text-[var(--danger)]">{error}</Pill> : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
                <Button onClick={() => setSelectedDate(toIsoDate(new Date()))}>Today</Button>
                <Button variant="secondary" onClick={() => openEventEditor()}>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  New event
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <SectionCard key={stat.label} title={stat.value} description={stat.label}>
                <div />
              </SectionCard>
            ))}
          </div>

          {pageContent}
        </div>
      </div>

      <AssistantDrawer />
      <WorkspaceEditors />
    </main>
  );
}
