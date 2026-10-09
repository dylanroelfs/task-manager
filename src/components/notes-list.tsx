"use client";

import { useDeferredValue, useState } from "react";
import type { NoteData } from "@/lib/notes";
import type { Project } from "@/lib/tasks";
import { NewNoteButton, NoteItem } from "./note-item";
import { inProject, ProjectFilter, projectOptions } from "./project-filter";
import { normalize, ResultCount, SearchInput, searchWords } from "./search-input";

/**
 * Pagina-inhoud van Notities: titel met filter- en plusknop, zoekbalk en de lijst.
 * Filtert live in de browser: elk woord moet voorkomen in de titel, tekst, het project
 * of het onderdeel.
 */
export function NotesList({
  notes,
  projects,
  initialProjectId,
}: {
  notes: NoteData[];
  projects: Project[];
  /** Uit ?project= in de URL. */
  initialProjectId?: string;
}) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(initialProjectId ?? null);
  const words = searchWords(useDeferredValue(query));

  // Een project dat niet (meer) in je lijst staat telt als "Geen project"
  const projectOf = (note: NoteData) => projects.find((p) => p.id === note.projectId) ?? null;
  // Gekozen project ook tonen als het (nog) geen notities heeft, bijv. vanaf een projectpagina
  const chosen = projects.find((p) => p.id === projectFilter) ?? null;
  const options = projectOptions(chosen ? [...notes.map(projectOf), chosen] : notes.map(projectOf));
  const filter = options.some((o) => o.id === projectFilter) ? projectFilter : null;
  const filtering = words.length > 0 || filter !== null;

  const results = notes.filter((note) => {
    const project = projectOf(note);
    if (!inProject(project?.id ?? null, filter)) return false;
    if (!words.length) return true;
    const haystack = normalize([note.title, note.body, project?.name, note.section].join(" "));
    return words.every((w) => haystack.includes(w));
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notities</h1>
        <div className="flex items-center gap-2">
          {options.length > 0 && (
            <ProjectFilter
              options={options}
              value={filter}
              onChange={(value) => {
                setProjectFilter(value);
                // URL bijhouden, zodat het filter blijft staan na herladen
                const url = new URL(window.location.href);
                if (value) url.searchParams.set("project", value);
                else url.searchParams.delete("project");
                window.history.replaceState(null, "", url);
              }}
            />
          )}
          <NewNoteButton projects={projects} />
        </div>
      </div>
      <section className="space-y-2">
        <SearchInput value={query} onChange={setQuery} label="Zoek in notities" />
        {filtering && <ResultCount count={results.length} />}
        {results.length > 0 ? (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {results.map((note) => (
                <NoteItem key={note.id} note={note} projects={projects} />
              ))}
            </ul>
          </div>
        ) : (
          !filtering && (
            <div className="card">
              <p className="px-4 py-12 text-center text-sm text-ink-3">
                Nog geen notities. Voeg er een toe met de plusknop.
              </p>
            </div>
          )
        )}
      </section>
    </>
  );
}
