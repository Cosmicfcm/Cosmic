"use client";

import { Pencil, Plus, Target, Trash2 } from "lucide-react";

import { deleteGoal } from "@/lib/client/workspace-actions";
import { useCosmicStore } from "@/store/cosmic-store";
import { Button, SectionCard } from "@/components/shared/ui";

export function GoalsPanel() {
  const goals = useCosmicStore((state) => state.goals);
  const openGoalEditor = useCosmicStore((state) => state.openGoalEditor);

  return (
    <SectionCard
      title="Goals"
      description="Long arc, short feedback loops."
      action={
        <Button onClick={() => openGoalEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          New goal
        </Button>
      }
    >
      <div className="space-y-3">
        {goals.map((goal) => (
          <article
            key={goal.id}
            className="rounded-3xl border border-white/8 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-white">{goal.title}</h3>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{goal.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-white/8 hover:text-white"
                  onClick={() =>
                    openGoalEditor({
                      id: goal.id,
                      title: goal.title,
                      description: goal.description,
                      horizon: goal.horizon,
                      progress: goal.progress,
                      target_date: goal.target_date ? goal.target_date.slice(0, 10) : null,
                      category_id: goal.category_id,
                      linked_task_ids: goal.linked_task_ids,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-white/8 hover:text-[var(--danger)]"
                  onClick={() => void deleteGoal(goal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
                <span>{goal.horizon === "short" ? "Short horizon" : "Long horizon"}</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
