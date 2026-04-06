"use client";

import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteTask, toggleTask } from "@/lib/client/workspace-actions";
import { formatShortDateTime } from "@/lib/date";
import { useCosmicStore } from "@/store/cosmic-store";
import { Button, SectionCard } from "@/components/shared/ui";

export function TasksPanel() {
  const tasks = useCosmicStore((state) => [...state.tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1;
    }
    return (left.due_at ?? "").localeCompare(right.due_at ?? "");
  }));
  const openTaskEditor = useCosmicStore((state) => state.openTaskEditor);

  return (
    <SectionCard
      title="Tasks"
      description="Keep the small promises visible."
      action={
        <Button onClick={() => openTaskEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          New task
        </Button>
      }
    >
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-[var(--muted)]">
            No tasks yet. Add one and link it to an event if it belongs on the calendar.
          </p>
        ) : null}

        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-3xl border border-white/8 bg-white/[0.03] p-4"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => void toggleTask(task.id)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                    {task.description ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {task.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-full p-2 text-[var(--muted)] hover:bg-white/8 hover:text-white"
                      onClick={() =>
                        openTaskEditor({
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          due_at: task.due_at ? task.due_at.slice(0, 16) : null,
                          linked_event_id: task.linked_event_id,
                          category_id: task.category_id,
                          priority: task.priority,
                          reminder_at: task.reminder_at ? task.reminder_at.slice(0, 16) : null,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-2 text-[var(--muted)] hover:bg-white/8 hover:text-[var(--danger)]"
                      onClick={() => void deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {task.due_at ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>{formatShortDateTime(task.due_at)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
