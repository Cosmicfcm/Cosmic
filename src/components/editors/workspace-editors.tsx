"use client";

import { useEffect, useState } from "react";

import {
  saveEventDraft,
  saveGoalDraft,
  saveNoteDraft,
  saveTaskDraft,
} from "@/lib/client/workspace-actions";
import { buildRecurrenceString } from "@/lib/recurrence";
import type { EventDraft, GoalDraft, NoteDraft, TaskDraft } from "@/lib/types";
import { useCosmicStore } from "@/store/cosmic-store";
import {
  Button,
  FieldLabel,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/shared/ui";

const weekdayOptions = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function EventEditorModal() {
  const categories = useCosmicStore((state) => state.categories);
  const { open, draft } = useCosmicStore((state) => state.eventEditor);
  const close = useCosmicStore((state) => state.closeEventEditor);
  const [form, setForm] = useState<EventDraft>(draft);

  useEffect(() => {
    setForm(draft);
  }, [draft]);

  return (
    <Modal open={open} title={draft.id ? "Edit event" : "New event"} onClose={close}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const nextDraft = {
            ...form,
            recurrence: {
              ...form.recurrence,
              rrule: form.recurrence.enabled
                ? buildRecurrenceString({
                    frequency: form.recurrence.frequency,
                    interval: form.recurrence.interval,
                    byWeekday: form.recurrence.byWeekday,
                    until: form.recurrence.until,
                  })
                : null,
            },
          };
          void saveEventDraft(nextDraft);
        }}
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <FieldLabel label="Title" htmlFor="event-title" />
            <Input
              id="event-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Focus block"
              required
            />
          </div>
          <div>
            <FieldLabel label="Start" htmlFor="event-start" />
            <Input
              id="event-start"
              type="datetime-local"
              value={form.start_at}
              onChange={(event) => setForm((current) => ({ ...current, start_at: event.target.value }))}
              required
            />
          </div>
          <div>
            <FieldLabel label="End" htmlFor="event-end" />
            <Input
              id="event-end"
              type="datetime-local"
              value={form.end_at}
              onChange={(event) => setForm((current) => ({ ...current, end_at: event.target.value }))}
              required
            />
          </div>
          <div>
            <FieldLabel label="Category" htmlFor="event-category" />
            <Select
              id="event-category"
              value={form.category_id ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category_id: event.target.value || null,
                }))
              }
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel label="Location" htmlFor="event-location" />
            <Input
              id="event-location"
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Description" htmlFor="event-description" />
            <Textarea
              id="event-description"
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Any prep, context, or notes"
            />
          </div>
          <div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                checked={form.recurrence.enabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    recurrence: {
                      ...current.recurrence,
                      enabled: event.target.checked,
                    },
                  }))
                }
              />
              Repeat this event
            </label>
          </div>
          <div>
            <FieldLabel label="Reminder offsets (minutes)" htmlFor="event-reminders" />
            <Input
              id="event-reminders"
              value={form.reminder_offsets.join(",")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reminder_offsets: event.target.value
                    .split(",")
                    .map((value) => Number(value.trim()))
                    .filter((value) => !Number.isNaN(value) && value >= 0),
                }))
              }
              placeholder="10,30,60"
            />
          </div>
        </FieldGrid>

        {form.recurrence.enabled ? (
          <div className="space-y-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <FieldGrid>
              <div>
                <FieldLabel label="Frequency" htmlFor="recurrence-frequency" />
                <Select
                  id="recurrence-frequency"
                  value={form.recurrence.frequency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recurrence: {
                        ...current.recurrence,
                        frequency: event.target.value as EventDraft["recurrence"]["frequency"],
                      },
                    }))
                  }
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </Select>
              </div>
              <div>
                <FieldLabel label="Interval" htmlFor="recurrence-interval" />
                <Input
                  id="recurrence-interval"
                  type="number"
                  min={1}
                  value={form.recurrence.interval}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recurrence: {
                        ...current.recurrence,
                        interval: Number(event.target.value || 1),
                      },
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel label="Weekdays" />
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map((option) => {
                    const active = form.recurrence.byWeekday.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-full px-3 py-2 text-sm ${
                          active
                            ? "bg-[var(--accent)] text-slate-950"
                            : "bg-white/6 text-[var(--muted)]"
                        }`}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            recurrence: {
                              ...current.recurrence,
                              byWeekday: active
                                ? current.recurrence.byWeekday.filter(
                                    (value) => value !== option.value,
                                  )
                                : [...current.recurrence.byWeekday, option.value],
                            },
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <FieldLabel label="Until" htmlFor="recurrence-until" />
                <Input
                  id="recurrence-until"
                  type="date"
                  value={form.recurrence.until ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recurrence: {
                        ...current.recurrence,
                        until: event.target.value || null,
                      },
                    }))
                  }
                />
              </div>
            </FieldGrid>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">Save event</Button>
        </div>
      </form>
    </Modal>
  );
}

function TaskEditorModal() {
  const categories = useCosmicStore((state) => state.categories);
  const events = useCosmicStore((state) => state.events);
  const { open, draft } = useCosmicStore((state) => state.taskEditor);
  const close = useCosmicStore((state) => state.closeTaskEditor);
  const [form, setForm] = useState<TaskDraft>(draft);

  useEffect(() => {
    setForm(draft);
  }, [draft]);

  return (
    <Modal open={open} title={draft.id ? "Edit task" : "New task"} onClose={close}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void saveTaskDraft(form);
        }}
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <FieldLabel label="Title" />
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Description" />
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel label="Due" />
            <Input
              type="datetime-local"
              value={form.due_at ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, due_at: event.target.value || null }))
              }
            />
          </div>
          <div>
            <FieldLabel label="Reminder" />
            <Input
              type="datetime-local"
              value={form.reminder_at ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reminder_at: event.target.value || null,
                }))
              }
            />
          </div>
          <div>
            <FieldLabel label="Category" />
            <Select
              value={form.category_id ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category_id: event.target.value || null,
                }))
              }
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel label="Linked event" />
            <Select
              value={form.linked_event_id ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linked_event_id: event.target.value || null,
                }))
              }
            >
              <option value="">No event link</option>
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </Select>
          </div>
        </FieldGrid>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">Save task</Button>
        </div>
      </form>
    </Modal>
  );
}

function NoteEditorModal() {
  const { open, draft } = useCosmicStore((state) => state.noteEditor);
  const close = useCosmicStore((state) => state.closeNoteEditor);
  const [form, setForm] = useState<NoteDraft>(draft);

  useEffect(() => {
    setForm(draft);
  }, [draft]);

  return (
    <Modal open={open} title={draft.id ? "Edit note" : "New note"} onClose={close}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void saveNoteDraft(form);
        }}
      >
        <FieldLabel label="Title" />
        <Input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <FieldLabel label="Content" />
        <Textarea
          rows={6}
          value={form.content}
          onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
        />
        <FieldLabel label="Tags" />
        <Input
          value={form.tags.join(",")}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              tags: event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            }))
          }
          placeholder="ideas, systems"
        />
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
          <input
            type="checkbox"
            checked={form.pinned}
            onChange={(event) =>
              setForm((current) => ({ ...current, pinned: event.target.checked }))
            }
          />
          Pin note
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">Save note</Button>
        </div>
      </form>
    </Modal>
  );
}

function GoalEditorModal() {
  const categories = useCosmicStore((state) => state.categories);
  const tasks = useCosmicStore((state) => state.tasks);
  const { open, draft } = useCosmicStore((state) => state.goalEditor);
  const close = useCosmicStore((state) => state.closeGoalEditor);
  const [form, setForm] = useState<GoalDraft>(draft);

  useEffect(() => {
    setForm(draft);
  }, [draft]);

  return (
    <Modal open={open} title={draft.id ? "Edit goal" : "New goal"} onClose={close}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void saveGoalDraft(form);
        }}
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <FieldLabel label="Title" />
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Description" />
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel label="Horizon" />
            <Select
              value={form.horizon}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  horizon: event.target.value as GoalDraft["horizon"],
                }))
              }
            >
              <option value="short">Short-term</option>
              <option value="long">Long-term</option>
            </Select>
          </div>
          <div>
            <FieldLabel label="Progress (%)" />
            <Input
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  progress: Number(event.target.value || 0),
                }))
              }
            />
          </div>
          <div>
            <FieldLabel label="Target date" />
            <Input
              type="date"
              value={form.target_date ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_date: event.target.value || null,
                }))
              }
            />
          </div>
          <div>
            <FieldLabel label="Category" />
            <Select
              value={form.category_id ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category_id: event.target.value || null,
                }))
              }
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Linked tasks" />
            <Select
              multiple
              value={form.linked_task_ids}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linked_task_ids: Array.from(event.target.selectedOptions).map(
                    (option) => option.value,
                  ),
                }))
              }
              className="min-h-36"
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </div>
        </FieldGrid>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">Save goal</Button>
        </div>
      </form>
    </Modal>
  );
}

export function WorkspaceEditors() {
  return (
    <>
      <EventEditorModal />
      <TaskEditorModal />
      <NoteEditorModal />
      <GoalEditorModal />
    </>
  );
}
