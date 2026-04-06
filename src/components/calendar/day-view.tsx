"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Clock3, MapPin, Trash2 } from "lucide-react";

import { formatTime, getCurrentTimeIndicatorTop, TIMELINE_HOUR_HEIGHT } from "@/lib/date";
import { buildOccurrenceStyle } from "@/lib/recurrence";
import type { EventOccurrence } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  createDefaultEventDraft,
  useCosmicStore,
  useDayOccurrences,
} from "@/store/cosmic-store";
import {
  deleteEventOccurrence,
  moveOccurrence,
  resizeOccurrence,
} from "@/lib/client/workspace-actions";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const PIXELS_PER_MINUTE = TIMELINE_HOUR_HEIGHT / 60;

function EventCard({
  occurrence,
}: {
  occurrence: EventOccurrence;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: occurrence.id,
    data: { occurrence },
  });
  const openEventEditor = useCosmicStore((state) => state.openEventEditor);

  const style = {
    ...buildOccurrenceStyle(occurrence),
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className={cn(
        "absolute overflow-hidden rounded-2xl border px-3 py-2 text-left transition-shadow",
        isDragging ? "z-30 shadow-2xl" : "z-10 shadow-lg",
      )}
      onClick={() =>
        openEventEditor({
          ...createDefaultEventDraft({
            id: occurrence.event_id,
            sourceEventId: occurrence.event_id,
            occurrenceDate: occurrence.occurrence_date,
            applyScope: occurrence.is_recurring_instance ? "instance" : "series",
            title: occurrence.title,
            description: occurrence.description,
            location: occurrence.location,
            category_id: occurrence.category_id,
            start_at: occurrence.start_at.slice(0, 16),
            end_at: occurrence.end_at.slice(0, 16),
            timezone: occurrence.timezone,
            reminder_offsets: occurrence.reminder_offsets,
          }),
        })
      }
    >
      <div
        {...listeners}
        {...attributes}
        className="absolute inset-0"
        style={{
          background:
            occurrence.color ??
            "linear-gradient(180deg, rgba(120,243,198,0.28), rgba(120,243,198,0.12))",
        }}
      />
      <div className="relative flex h-full flex-col justify-between rounded-xl border border-white/10 bg-slate-950/55 p-2">
        <div>
          <p className="text-sm font-semibold text-white">{occurrence.title}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/70">
            <Clock3 className="h-3.5 w-3.5" />
            <span>
              {formatTime(occurrence.start_at)} - {formatTime(occurrence.end_at)}
            </span>
          </div>
          {occurrence.location ? (
            <div className="mt-1 flex items-center gap-2 text-[11px] text-white/55">
              <MapPin className="h-3.5 w-3.5" />
              <span>{occurrence.location}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">
            {occurrence.is_recurring_instance ? "Recurring" : "One-time"}
          </span>
          <button
            type="button"
            className="rounded-full bg-slate-950/70 p-1 text-white/70 transition hover:text-[var(--danger)]"
            onClick={(event) => {
              event.stopPropagation();
              void deleteEventOccurrence(occurrence);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          className="absolute bottom-0 left-1/2 h-3 w-12 -translate-x-1/2 cursor-ns-resize rounded-full bg-white/18"
          onPointerDown={(event) => {
            event.stopPropagation();
            const startY = event.clientY;
            const startMinutes =
              (new Date(occurrence.end_at).getTime() - new Date(occurrence.start_at).getTime()) /
              60_000;

            const onMove = (moveEvent: PointerEvent) => {
              moveEvent.preventDefault();
            };

            const onUp = (upEvent: PointerEvent) => {
              const deltaMinutes = Math.round(
                ((upEvent.clientY - startY) / PIXELS_PER_MINUTE) / 15,
              ) * 15;
              const nextDuration = Math.max(15, startMinutes + deltaMinutes);
              void resizeOccurrence(occurrence, nextDuration);
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };

            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
        />
      </div>
    </button>
  );
}

export function DayView() {
  const occurrences = useDayOccurrences();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const selectedDate = useCosmicStore((state) => state.selectedDate);
  const activeCategoryId = useCosmicStore((state) => state.activeCategoryId);
  const openEventEditor = useCosmicStore((state) => state.openEventEditor);

  const visibleOccurrences = useMemo(
    () =>
      activeCategoryId
        ? occurrences.filter((occurrence) => occurrence.category_id === activeCategoryId)
        : occurrences,
    [activeCategoryId, occurrences],
  );

  const currentTimeTop = getCurrentTimeIndicatorTop(selectedDate);

  const onDragEnd = async (event: DragEndEvent) => {
    const occurrence = event.active.data.current?.occurrence as EventOccurrence | undefined;
    if (!occurrence) {
      return;
    }

    const deltaMinutes =
      Math.round(((event.delta.y / PIXELS_PER_MINUTE) / 15)) * 15;

    if (deltaMinutes !== 0) {
      await moveOccurrence(occurrence, deltaMinutes);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div
        className="glass-panel overflow-hidden rounded-[32px]"
        onDoubleClick={(event) => {
          const target = event.currentTarget.getBoundingClientRect();
          const y = event.clientY - target.top + event.currentTarget.scrollTop;
          const snappedMinutes = Math.max(0, Math.round((y / PIXELS_PER_MINUTE) / 15) * 15);
          const start = new Date(`${selectedDate}T00:00:00`);
          start.setMinutes(snappedMinutes);
          const end = new Date(start.getTime() + 60 * 60_000);

          openEventEditor({
            start_at: start.toISOString().slice(0, 16),
            end_at: end.toISOString().slice(0, 16),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }}
      >
        <div className="grid grid-cols-[72px_1fr]">
          <div className="border-r border-white/8 bg-slate-950/30 px-3 pt-8">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative flex h-16 items-start justify-end pr-3 text-xs text-[var(--muted)]"
              >
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          <div className="relative timeline-grid h-[calc(24*64px)] min-h-[720px] bg-white/[0.02]">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="border-b border-white/[0.05]"
                style={{ height: `${TIMELINE_HOUR_HEIGHT}px` }}
              />
            ))}

            {currentTimeTop !== null ? (
              <div
                className="absolute left-0 right-0 z-20 h-px bg-[var(--accent)]"
                style={{ top: `${currentTimeTop}px` }}
              >
                <span className="absolute -top-2 left-0 h-4 w-4 rounded-full border-2 border-slate-950 bg-[var(--accent)]" />
              </div>
            ) : null}

            <div className="absolute inset-0">
              {visibleOccurrences.map((occurrence) => (
                <EventCard key={occurrence.id} occurrence={occurrence} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
