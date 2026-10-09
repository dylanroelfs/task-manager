"use client";

import { useRef, useTransition } from "react";
import { deleteNote } from "@/lib/actions/notes";
import type { NoteData } from "@/lib/notes";
import type { Project } from "@/lib/tasks";
import { CalendarIcon, PlusIcon } from "./icons";
import { NotePreview } from "./note-body";
import { NoteDialog } from "./note-dialog";
import { ProjectDot } from "./project-dot";

const tagClass =
  "inline-flex max-w-40 shrink-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-inset ring-line";

export function NoteItem({ note, projects }: { note: NoteData; projects: Project[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const project = projects.find((p) => p.id === note.projectId);

  /** Vanuit de popup. Vraagt eerst om bevestiging; geeft terug of de notitie verwijderd wordt. */
  function remove() {
    if (!confirm(`Weet je zeker dat je de notitie "${note.title}" wilt verwijderen?`)) return false;
    startTransition(() => deleteNote(note.id));
    return true;
  }

  return (
    // Klik op het kaartje opent de notitie; de popup zelf staat hier binnen
    <li
      onClick={(e) => {
        // Links in het voorproefje openen de link, niet de notitie
        if ((e.target as Element).closest("a, button, dialog")) return;
        dialogRef.current?.showModal();
      }}
      className={`cursor-pointer px-5 py-4 transition-colors hover:bg-surface-2/60 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="min-w-0 pt-0.5 text-left text-sm font-medium outline-none focus-visible:underline"
        >
          {note.title}
        </button>
        {/* Aanmaakdatum rechtsboven; op mobiel staat hij bij de tags, zodat de titel ruimte heeft */}
        <span className={`${tagClass} hidden! tabular-nums sm:inline-flex!`} title={`Aangemaakt op ${note.createdLabel}`}>
          <CalendarIcon width={12} height={12} />
          {note.createdLabel}
        </span>
      </div>
      {note.body && <NotePreview body={note.body} />}
      <div className={`mt-2 flex-wrap gap-1.5 ${project ? "flex" : "flex sm:hidden"}`}>
        {project && (
          <span className={tagClass}>
            <ProjectDot color={project.color} size={7} />
            <span className="truncate">{project.name}</span>
          </span>
        )}
        {project && note.section && (
          <span className={tagClass}>
            <span className="truncate">{note.section}</span>
          </span>
        )}
        <span className={`${tagClass} tabular-nums sm:hidden!`}>
          <CalendarIcon width={12} height={12} />
          {note.createdLabel}
        </span>
      </div>
      <NoteDialog mode="edit" dialogRef={dialogRef} projects={projects} note={note} onDelete={remove} />
    </li>
  );
}

/** Kleine plusknop naast de titel van de pagina. */
export function NewNoteButton({ projects }: { projects: Project[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open() {
    dialogRef.current?.showModal();
    dialogRef.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        title="Nieuwe notitie"
        aria-label="Nieuwe notitie"
        className="icon-button"
      >
        <PlusIcon width={18} height={18} />
      </button>
      <NoteDialog mode="create" dialogRef={dialogRef} projects={projects} />
    </>
  );
}
