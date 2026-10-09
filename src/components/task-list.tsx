"use client";

import { useDeferredValue, useState } from "react";
import type { Member, Project, TaskItemData } from "@/lib/tasks";
import { inProject, ProjectFilter, projectOptions } from "./project-filter";
import { normalize, ResultCount, SearchInput, searchWords } from "./search-input";
import { TaskItem } from "./task-item";

/** Elk zoekwoord komt voor in de titel, beschrijving, het project, onderdeel of de datum. */
export function taskMatches(task: TaskItemData, projects: Project[], words: string[]) {
  const project = projects.find((p) => p.id === task.projectId)?.name ?? task.foreignProject?.name;
  const haystack = normalize(
    [task.title, task.description, project, task.section, task.dueLabel, task.doneLabel].join(" "),
  );
  return words.every((w) => haystack.includes(w));
}

export function TaskList({
  tasks,
  projects,
  members,
}: {
  tasks: TaskItemData[];
  projects: Project[];
  members: Member[];
}) {
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} projects={projects} members={members} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Pagina-inhoud van Open en Afgerond: titel met filterknop (en eventueel een plusknop),
 * zoekbalk en de lijst. Zoeken en filteren gebeurt live in de browser.
 */
export function SearchableTaskList({
  title,
  action,
  tasks,
  projects,
  members,
  label,
  empty,
}: {
  title: string;
  /** Knop naast de filterknop, bijv. de plusknop voor een nieuwe taak. */
  action?: React.ReactNode;
  tasks: TaskItemData[];
  projects: Project[];
  members: Member[];
  /** Placeholder van de zoekbalk, bijv. "Zoek in open taken". */
  label: string;
  /** Tekst als er helemaal geen taken zijn. */
  empty: string;
}) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const words = searchWords(useDeferredValue(query));

  // Project per taak; een project dat we niet kennen telt als "Geen project"
  const projectOf = (t: TaskItemData) => {
    const project = projects.find((p) => p.id === t.projectId) ?? t.foreignProject;
    return t.projectId && project ? { id: t.projectId, name: project.name, color: project.color } : null;
  };
  const options = projectOptions(tasks.map(projectOf));
  // Project niet meer in de lijst (bijv. verwijderd of laatste taak afgerond): filter vervalt
  const filter = options.some((o) => o.id === projectFilter) ? projectFilter : null;
  const filtering = words.length > 0 || filter !== null;
  const results = tasks.filter(
    (t) => inProject(projectOf(t)?.id ?? null, filter) && (!words.length || taskMatches(t, projects, words)),
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          {options.length > 0 && (
            <ProjectFilter options={options} value={filter} onChange={setProjectFilter} />
          )}
          {action}
        </div>
      </div>
      <section className="space-y-2">
        <SearchInput value={query} onChange={setQuery} label={label} />
        {filtering && <ResultCount count={results.length} />}
        {results.length > 0 ? (
          <TaskList tasks={results} projects={projects} members={members} />
        ) : (
          !filtering && (
            <div className="card">
              <p className="px-4 py-12 text-center text-sm text-ink-3">{empty}</p>
            </div>
          )
        )}
      </section>
    </>
  );
}
