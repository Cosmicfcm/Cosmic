"use client";

import { useDeferredValue } from "react";
import { Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";

import { deleteNote } from "@/lib/client/workspace-actions";
import { useCosmicStore } from "@/store/cosmic-store";
import { Button, Input, SectionCard } from "@/components/shared/ui";

export function NotesPanel() {
  const notes = useCosmicStore((state) => state.notes);
  const noteSearch = useCosmicStore((state) => state.noteSearch);
  const setNoteSearch = useCosmicStore((state) => state.setNoteSearch);
  const openNoteEditor = useCosmicStore((state) => state.openNoteEditor);
  const deferredSearch = useDeferredValue(noteSearch);

  const visibleNotes = notes.filter((note) =>
    note.search_text.includes(deferredSearch.toLowerCase()),
  );

  return (
    <SectionCard
      title="To remember"
      description="Fast memory with tags and search."
      action={
        <Button onClick={() => openNoteEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          New note
        </Button>
      }
    >
      <div className="mb-4 relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={noteSearch}
          onChange={(event) => setNoteSearch(event.target.value)}
          placeholder="Search tags, titles, and memory scraps"
          className="pl-11"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {visibleNotes.map((note) => (
          <article
            key={note.id}
            className="rounded-3xl border border-white/8 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {note.pinned ? <Pin className="h-4 w-4 text-[var(--accent)]" /> : null}
                <h3 className="text-sm font-semibold text-white">{note.title}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-white/8 hover:text-white"
                  onClick={() =>
                    openNoteEditor({
                      id: note.id,
                      title: note.title,
                      content: note.content,
                      tags: note.tags,
                      pinned: note.pinned,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-white/8 hover:text-[var(--danger)]"
                  onClick={() => void deleteNote(note.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{note.content}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-[var(--muted)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
