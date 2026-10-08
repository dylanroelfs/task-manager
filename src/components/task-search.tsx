"use client";

import { useDeferredValue, useState } from "react";
import type { Member, Project, TaskItemData } from "@/lib/tasks";
import { CloseIcon, SearchIcon } from "./icons";
import { TaskItem } from "./task-item";

type Filter = "all" | "open" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "open", label: "Open" },
  { value: "done", label: "Afgerond" },
];

/** Kleine letters, zonder accenten, zodat "creeren" ook "creëren" vindt. */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Zoeken in alle taken (open en afgerond). Filtert live in de browser: elk woord moet
 * voorkomen in de titel, beschrijving, het project, onderdeel of de datum. De lijst
 * verschijnt pas als je iets typt.
 */
export function TaskSearch({
  tasks,
  projects,
  members,
}: {
  tasks: TaskItemData[];
  projects: Project[];
  members: Member[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const deferredQuery = useDeferredValue(query);

  const words = normalize(deferredQuery).split(/\s+/).filter(Boolean);
  // Zonder zoekterm geen lijst: open en afgeronde taken hebben hun eigen pagina
  const results = tasks.filter((task) => {
    if (!words.length) return false;
    if (filter === "open" && task.done) return false;
    if (filter === "done" && !task.done) return false;
    const project = projects.find((p) => p.id === task.projectId)?.name ?? task.foreignProject?.name;
    const haystack = normalize(
      [task.title, task.description, project, task.section, task.dueLabel, task.doneLabel].join(" "),
    );
    return words.every((w) => haystack.includes(w));
  });

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-ink-3">
            <SearchIcon width={17} height={17} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Zoek in alle taken"
            aria-label="Zoek in alle taken"
            className="h-11 w-full rounded-2xl border border-line bg-surface pl-10 pr-10 text-sm outline-none placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Zoekopdracht wissen"
              className="absolute inset-y-0 right-2 my-auto grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <CloseIcon width={15} height={15} />
            </button>
          )}
        </label>
        <div
          role="radiogroup"
          aria-label="Status"
          className="inline-flex h-11 rounded-2xl border border-line bg-surface p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-xl px-3 text-sm ${
                filter === f.value ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {words.length > 0 && (
        <>
          <p className="px-1 text-xs text-ink-3" aria-live="polite">
            {results.length} {results.length === 1 ? "resultaat" : "resultaten"} gevonden
          </p>
          {results.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <ul className="divide-y divide-line">
                {results.map((task) => (
                  <TaskItem key={task.id} task={task} projects={projects} members={members} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
