"use client";

import { useId, useRef, useState, useTransition, type RefObject } from "react";
import { createNote, updateNote } from "@/lib/actions/notes";
import type { NoteData } from "@/lib/notes";
import { BULLET, bulletLevel, INDENT, MAX_LEVEL, withBullets } from "@/lib/note-text";
import type { Project } from "@/lib/tasks";
import { CalendarIcon, CloseIcon, PencilIcon, TrashIcon } from "./icons";
import { NoteBody } from "./note-body";
import { ProjectDot } from "./project-dot";
import { ProjectSectionFields } from "./task-dialog";
import { useBackdropClose } from "./use-backdrop-close";

const tagClass =
  "inline-flex max-w-48 shrink-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-inset ring-line";

type CreateProps = {
  mode: "create";
  dialogRef: RefObject<HTMLDialogElement | null>;
  projects: Project[];
};

type EditProps = {
  mode: "edit";
  dialogRef: RefObject<HTMLDialogElement | null>;
  projects: Project[];
  note: NoteData;
  /** Vraagt zelf om bevestiging; true als de notitie verwijderd wordt. */
  onDelete: () => boolean;
};

/**
 * Eén popup voor nieuwe en bestaande notities. Een bestaande notitie opent om te lezen
 * (met klikbare links); pas na "Bewerken" worden het formuliervelden.
 */
export function NoteDialog(props: CreateProps | EditProps) {
  const { dialogRef, projects } = props;
  const note = props.mode === "edit" ? props.note : null;
  const project = note ? projects.find((p) => p.id === note.projectId) : undefined;

  const values = note
    ? {
        title: note.title,
        // Oude notities met "- " of "* " meteen als bolletjes tonen
        body: withBullets(note.body),
        projectId: note.projectId ?? "",
        section: note.sectionId && note.section ? { id: note.sectionId, name: note.section } : null,
      }
    : { title: "", body: "", projectId: "", section: null };

  const headingId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState(!note);
  const [error, setError] = useState<string | null>(null);
  // Zie TaskDialog: nieuwe key bij elke reset, zodat project en onderdeel goed terugspringen
  const [resets, setResets] = useState(0);
  const [saving, startSaving] = useTransition();

  function close() {
    dialogRef.current?.close();
  }

  function startEditing() {
    setEditing(true);
    // Na het renderen van het formulier: cursor aan het eind van de tekst
    requestAnimationFrame(() => {
      const body = formRef.current?.elements.namedItem("body");
      if (body instanceof HTMLTextAreaElement) {
        body.focus();
        body.setSelectionRange(body.value.length, body.value.length);
      }
    });
  }

  /** Bewerken stoppen zonder op te slaan: terug naar lezen. */
  function stopEditing() {
    setEditing(false);
    setError(null);
  }

  const backdrop = useBackdropClose(close);

  function save(formData: FormData) {
    startSaving(async () => {
      const result = note ? await updateNote(note.id, formData) : await createNote(formData);
      if (result) setError(result);
      // Bestaande notitie: terug naar lezen, met de opgeslagen tekst
      else if (note) stopEditing();
      else close();
    });
  }

  const closeButton = (
    <button
      type="button"
      onClick={close}
      aria-label="Sluiten"
      className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
    >
      <CloseIcon width={17} height={17} />
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      // Bij sluiten (ook via Esc) niet-opgeslagen wijzigingen weggooien; volgende keer weer lezen
      onClose={() => {
        formRef.current?.reset();
        setError(null);
        setEditing(!note);
      }}
      {...backdrop}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/20 backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      {note && !editing ? (
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id={headingId} className="min-w-0 pt-1 text-lg font-medium leading-snug [overflow-wrap:anywhere]">
              {note.title}
            </h2>
            {closeButton}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
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
            <span className={`${tagClass} tabular-nums`} title="Aangemaakt op">
              <CalendarIcon width={12} height={12} />
              {note.createdLabel}
            </span>
          </div>

          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {note.body ? (
              <NoteBody body={note.body} />
            ) : (
              <p className="text-sm text-ink-3">Deze notitie heeft nog geen tekst.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => {
                if (props.mode === "edit" && props.onDelete()) close();
              }}
              aria-label="Notitie verwijderen"
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-3 hover:border-bad/40 hover:text-bad"
            >
              <TrashIcon width={15} height={15} />
            </button>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-lg px-3.5 text-sm text-ink-2 hover:bg-surface-2"
              >
                Sluiten
              </button>
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-medium text-surface hover:opacity-90"
              >
                <PencilIcon width={15} height={15} />
                Bewerken
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form
          ref={formRef}
          key={`${values.title}|${values.body}|${values.projectId}|${values.section?.id ?? ""}|${resets}`}
          onReset={() => setResets((n) => n + 1)}
          action={save}
          className="p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id={headingId} className="text-sm font-medium text-ink-2">
              {note ? "Notitie bewerken" : "Nieuwe notitie"}
            </h2>
            {closeButton}
          </div>

          <input
            name="title"
            required
            maxLength={200}
            defaultValue={values.title}
            placeholder="Titel"
            aria-label="Titel"
            className="mt-3 w-full bg-transparent text-lg font-medium outline-none placeholder:text-ink-3"
          />

          <textarea
            name="body"
            maxLength={10000}
            rows={12}
            defaultValue={values.body}
            onKeyDown={bulletKeys}
            placeholder="Schrijf je notitie…"
            aria-label="Notitie"
            className="mt-2 w-full resize-y rounded-lg bg-surface-2/60 px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-ink-3 focus:ring-4 focus:ring-accent-soft"
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProjectSectionFields
              projects={projects}
              initialProjectId={values.projectId}
              initialSection={values.section}
            />
          </div>

          {error && <p className="mt-4 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={note ? stopEditing : close}
              className="h-9 rounded-lg px-3.5 text-sm text-ink-2 hover:bg-surface-2"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 rounded-lg bg-ink px-4 text-sm font-medium text-surface hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Opslaan…" : note ? "Opslaan" : "Toevoegen"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

/**
 * Puntenlijst tijdens het typen, zoals in Apple Notes:
 * - "- " of "* " aan het begin van een regel wordt een bolletje;
 * - Enter op een regel met een bolletje begint een nieuw punt op hetzelfde niveau;
 * - Enter op een leeg punt springt eerst terug, en stopt bovenaan de lijst;
 * - Tab maakt van een punt een subpunt, Shift+Tab zet het een niveau terug.
 * Tab buiten een lijst doet gewoon wat het altijd doet (naar het volgende veld).
 */
function bulletKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.nativeEvent.isComposing) return;
  const el = e.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = el;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const beforeCursor = value.slice(lineStart, start);

  if (e.key === "Tab") {
    if (indentLines(el, e.shiftKey ? -1 : 1)) e.preventDefault();
    return;
  }
  if (start !== end && e.key !== "Enter") return;

  const marker = /^([ \t]*)[-*]$/.exec(beforeCursor);
  if (e.key === " " && marker) {
    e.preventDefault();
    el.setRangeText(marker[1] + BULLET, lineStart, start, "end");
    return;
  }

  const level = bulletLevel(beforeCursor);
  if (e.key === "Enter" && !e.shiftKey && level !== null) {
    e.preventDefault();
    const prefix = INDENT.repeat(level) + BULLET;
    if (beforeCursor === prefix && start === end) {
      // Leeg punt: een niveau terug, of bovenaan de lijst stoppen
      el.setRangeText(level > 0 ? INDENT.repeat(level - 1) + BULLET : "", lineStart, start, "end");
    } else {
      el.setRangeText(`\n${prefix}`, start, end, "end");
    }
  }
}

/**
 * Springt de lijstregels in de selectie (of de regel van de cursor) een niveau in of terug.
 * Geeft false als er geen lijstregel bij zit; dan doet Tab gewoon zijn normale werk.
 */
function indentLines(el: HTMLTextAreaElement, direction: 1 | -1) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const to = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(from, to).split("\n");
  if (!lines.some((l) => bulletLevel(l) !== null)) return false;

  let firstShift = 0;
  let totalShift = 0;
  const next = lines.map((line, i) => {
    const level = bulletLevel(line);
    if (level === null) return line;
    const newLevel = Math.max(0, Math.min(MAX_LEVEL, level + direction));
    const rest = line.slice(line.indexOf(BULLET));
    const result = INDENT.repeat(newLevel) + rest;
    const shift = result.length - line.length;
    if (i === 0) firstShift = shift;
    totalShift += shift;
    return result;
  });

  el.setRangeText(next.join("\n"), from, to);
  // Cursor (of selectie) blijft op dezelfde plek in de tekst staan
  el.setSelectionRange(Math.max(from, start + firstShift), end + totalShift);
  return true;
}
