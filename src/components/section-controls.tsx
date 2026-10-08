"use client";

import { useId, useRef, useState, useTransition } from "react";
import { createSection, deleteSection } from "@/lib/actions/projects";
import type { Section } from "@/lib/tasks";
import { CloseIcon, PlusIcon } from "./icons";
import { useBackdropClose } from "./use-backdrop-close";

/** Knop met popup: naam invullen, bestaande onderdelen als tags ernaast ter controle. */
export function NewSectionButton({ projectId, sections }: { projectId: string; sections: Section[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function open() {
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  }

  function close() {
    dialogRef.current?.close();
  }

  const backdrop = useBackdropClose(close);

  // Popup blijft open na toevoegen: de nieuwe tag verschijnt en je kunt meteen de volgende typen
  function save(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      const result = await createSection(projectId, name);
      setError(result);
      if (!result) setName("");
      inputRef.current?.focus();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface px-4 py-3.5 text-sm text-ink-3 transition-colors hover:border-accent/50 hover:text-ink-2"
      >
        <PlusIcon width={18} height={18} />
        Nieuw onderdeel
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        onClose={() => {
          setName("");
          setError(null);
        }}
        // Klik op de achtergrond sluit de popup (niet bij tekst selecteren en buiten loslaten)
        {...backdrop}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/20 backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        <form onSubmit={save} className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={headingId} className="text-sm font-medium text-ink-2">
              Nieuw onderdeel
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Sluiten"
              className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <CloseIcon width={17} height={17} />
            </button>
          </div>

          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            placeholder="Naam, bijv. AVN-15 of Bugfixes"
            aria-label="Naam van het onderdeel"
            className="mt-3 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft"
          />

          <div className="mt-4">
            <p className="text-xs text-ink-3">
              {sections.length ? `Bestaande onderdelen (${sections.length})` : "Nog geen onderdelen in dit project."}
            </p>
            {sections.length > 0 && (
              <ul className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {sections.map((s) => (
                  <SectionTag key={s.id} section={s} />
                ))}
              </ul>
            )}
          </div>

          {error && <p className="mt-4 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

          <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={close}
              className="h-9 rounded-lg px-3.5 text-sm text-ink-2 hover:bg-surface-2"
            >
              Sluiten
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="h-9 rounded-lg bg-ink px-4 text-sm font-medium text-surface hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Toevoegen…" : "Toevoegen"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function confirmDelete(name: string) {
  return confirm(
    `Weet je zeker dat je het onderdeel "${name}" wilt verwijderen? De taken blijven in het project, zonder onderdeel.`,
  );
}

/** Tag in de popup met een kruisje om het onderdeel te verwijderen. */
function SectionTag({ section }: { section: Section }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirmDelete(section.name)) return;
    startTransition(() => deleteSection(section.id));
  }

  return (
    <li
      className={`inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 py-0.5 pl-2.5 pr-1 text-xs text-ink-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      {section.name}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={`Onderdeel ${section.name} verwijderen`}
        title="Onderdeel verwijderen"
        className="grid h-4 w-4 place-items-center rounded-full text-ink-3 hover:bg-bad/10 hover:text-bad"
      >
        <CloseIcon width={11} height={11} strokeWidth={2.25} />
      </button>
    </li>
  );
}
