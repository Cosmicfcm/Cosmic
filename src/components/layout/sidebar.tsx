"use client";

import Link from "next/link";
import { Bot, CalendarDays, Goal, NotebookPen, Settings2, SquareCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkspaceSection } from "@/lib/types";

const navigation = [
  { href: "/", label: "Day", icon: CalendarDays, section: "day" },
  { href: "/tasks", label: "Tasks", icon: SquareCheck, section: "tasks" },
  { href: "/remember", label: "Remember", icon: NotebookPen, section: "remember" },
  { href: "/goals", label: "Goals", icon: Goal, section: "goals" },
  { href: "/settings", label: "Settings", icon: Settings2, section: "settings" },
] satisfies Array<{
  href: string;
  label: string;
  icon: typeof CalendarDays;
  section: WorkspaceSection;
}>;

export function Sidebar({
  activeSection,
  onAssistantOpen,
}: {
  activeSection: WorkspaceSection;
  onAssistantOpen: () => void;
}) {
  return (
    <aside className="glass-panel flex h-full flex-col rounded-[30px] p-4">
      <div className="mb-8 px-2 pt-2">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Cosmic
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Daily control room</h1>
      </div>

      <nav className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.section === activeSection;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors",
                active
                  ? "bg-[var(--accent-soft)] text-white"
                  : "text-[var(--muted)] hover:bg-white/6 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onAssistantOpen}
        className="mt-auto flex items-center gap-3 rounded-[24px] border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-4 text-left transition hover:border-[var(--accent)]/35"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-slate-950">
          <Bot className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">Open assistant</span>
          <span className="block text-xs text-[var(--muted)]">Press `/` anytime</span>
        </span>
      </button>
    </aside>
  );
}
