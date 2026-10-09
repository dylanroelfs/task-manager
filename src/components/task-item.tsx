"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/supabase/database.types";
import type { Member, Project, TaskItemData } from "@/lib/tasks";
import { CalendarIcon, CheckIcon } from "./icons";
import { ProjectDot } from "./project-dot";
import { TaskDialog } from "./task-dialog";

const tagClass =
  "inline-flex max-w-40 shrink-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-inset ring-line";

// Eerste zin (of eerste regel) van de beschrijving, als voorproefje in de lijst.
function firstSentence(text: string) {
  const line = text.trim().split("\n")[0];
  return line.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? line;
}

export function TaskItem({
  task,
  projects,
  members,
}: {
  task: TaskItemData;
  projects: Project[];
  members: Member[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [status, setOptimisticStatus] = useOptimistic(task.status);
  const done = status === "done";
  const project = projects.find((p) => p.id === task.projectId) ?? task.foreignProject;
  const description = task.description?.trim() ?? "";
  const preview = firstSentence(description);
  const hasMore = preview !== description;

  function changeStatus(next: TaskStatus) {
    startTransition(async () => {
      setOptimisticStatus(next);
      await setTaskStatus(task.id, next);
    });
  }

  // Het rondje vinkt af, of zet een afgeronde taak terug naar "Te doen"
  function toggle() {
    changeStatus(done ? "todo" : "done");
  }

  /** Vanuit de popup. Vraagt eerst om bevestiging; geeft terug of de taak verwijderd wordt. */
  function remove() {
    if (!confirm(`Weet je zeker dat je de taak "${task.title}" wilt verwijderen?`)) return false;
    startTransition(() => deleteTask(task.id));
    return true;
  }

  return (
    // Klik ergens op het kaartje opent de taak; knoppen en de popup zelf (die hier binnen
    // staat) houden hun eigen klikgedrag. Toetsenbord: via de titel.
    <li
      onClick={(e) => {
        if ((e.target as Element).closest("button, select, label, a, input, textarea, dialog")) return;
        dialogRef.current?.showModal();
      }}
      className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:items-center sm:px-5 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `${task.title} als open markeren` : `${task.title} afvinken`}
        className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors sm:mt-0 ${
          done ? "border-accent bg-accent text-white" : "border-ink-3/60 hover:border-accent"
        }`}
      >
        {done && <CheckIcon width={12} height={12} strokeWidth={3} />}
      </button>

      {/* Mobiel: tags onder de titel; vanaf sm ernaast */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:flex-1">
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            title="Taak openen"
            className={`line-clamp-2 w-full rounded text-left text-sm outline-none sm:block sm:truncate hover:text-accent focus-visible:ring-2 focus-visible:ring-accent-soft ${
              done ? "text-ink-3 line-through" : ""
            }`}
          >
            {task.title}
            {!task.isOwner && <span className="ml-2 text-xs text-ink-3">van {task.ownerName}</span>}
          </button>

          {/* Voorproefje; de volledige beschrijving staat in de popup */}
          {description && (
            <p className="mt-0.5 truncate text-xs text-ink-3">{hasMore ? `${preview}…` : preview}</p>
          )}
        </div>

        {/* Tags: project, onderdeel, ingestelde datum (afronddatum staat in de tooltip) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
          {project && (
            <span className={tagClass}>
              <ProjectDot color={project.color} size={7} />
              <span className="truncate">{project.name}</span>
            </span>
          )}
          {task.section && (
            <span className={tagClass}>
              <span className="truncate">{task.section}</span>
            </span>
          )}
          {task.dueLabel && (
            <span
              className={`${tagClass} tabular-nums ${!done && task.overdue ? "bg-bad/10! text-bad! ring-bad/25!" : ""}`}
              title={done && task.doneLabel ? `Afgerond op ${task.doneLabel}` : task.overdue ? "Te laat" : undefined}
            >
              <CalendarIcon width={12} height={12} />
              {task.dueLabel}
            </span>
          )}
        </div>
      </div>

      <TaskDialog
        mode="edit"
        dialogRef={dialogRef}
        task={task}
        status={status}
        projectId={task.projectId}
        projects={projects}
        members={members}
        onStatusChange={changeStatus}
        onDelete={remove}
      />
    </li>
  );
}
