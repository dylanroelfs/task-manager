"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { deleteTask, setTaskProject, setTaskStatus } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { statusInfo, TASK_STATUSES } from "@/lib/task-status";
import type { Member, Project, TaskItemData } from "@/lib/tasks";
import { CalendarIcon, CheckIcon, ChevronIcon, TrashIcon } from "./icons";
import { ProjectDot } from "./project-dot";
import { TaskDialog } from "./task-dialog";

const priorityStyle = {
  high: { label: "Hoog", className: "text-bad bg-bad/10" },
  medium: { label: "Normaal", className: "text-ink-2 bg-surface-2" },
  low: { label: "Laag", className: "text-ink-3 bg-surface-2" },
};

// Eerste zin (of eerste regel) van de beschrijving, voor de ingeklapte weergave.
function firstSentence(text: string) {
  const line = text.trim().split("\n")[0];
  return line.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? line;
}

export function TaskItem({
  task,
  projects,
  members,
  showProject = true,
}: {
  task: TaskItemData;
  projects: Project[];
  members: Member[];
  /** Uit in een lijst die al per project gegroepeerd is. */
  showProject?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { status: task.status, projectId: task.projectId },
    (state, patch: Partial<{ status: TaskStatus; projectId: string | null }>) => ({ ...state, ...patch }),
  );
  const { status, projectId } = optimistic;
  const done = status === "done";
  const statusStyle = statusInfo(status);
  const priority = priorityStyle[task.priority];
  const project = projects.find((p) => p.id === projectId) ?? task.foreignProject;
  const assignee = members.find((m) => m.id === task.assigneeId);
  const description = task.description?.trim() ?? "";
  const preview = firstSentence(description);
  const hasMore = preview !== description;

  function changeStatus(next: TaskStatus) {
    startTransition(async () => {
      setOptimistic({ status: next });
      await setTaskStatus(task.id, next);
    });
  }

  // Het rondje vinkt af, of zet een afgeronde taak terug naar "Te doen"
  function toggle() {
    changeStatus(done ? "todo" : "done");
  }

  function changeProject(value: string) {
    const next = value || null;
    startTransition(async () => {
      setOptimistic({ projectId: next });
      await setTaskProject(task.id, next);
    });
  }

  function remove() {
    startTransition(() => deleteTask(task.id));
  }

  return (
    // Klik ergens op het kaartje opent de taak; knoppen, keuzelijsten en de popup zelf
    // (die hier binnen staat) houden hun eigen klikgedrag. Toetsenbord: via de titel.
    <li
      onClick={(e) => {
        if ((e.target as Element).closest("button, select, label, a, input, textarea, dialog")) return;
        dialogRef.current?.showModal();
      }}
      className={`group flex cursor-pointer items-center gap-3 px-4 py-3 transition-opacity hover:bg-surface-2/50 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `${task.title} als open markeren` : `${task.title} afvinken`}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
          done ? "border-accent bg-accent text-white" : "border-ink-3/60 hover:border-accent"
        }`}
      >
        {done && <CheckIcon width={12} height={12} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          title="Taak openen"
          className={`block w-full truncate rounded text-left text-sm outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent-soft ${
            done ? "text-ink-3 line-through" : ""
          }`}
        >
          {task.title}
          {!task.isOwner && <span className="ml-2 text-xs text-ink-3">van {task.ownerName}</span>}
        </button>

        {description && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            title={expanded ? "Beschrijving inklappen" : "Beschrijving uitklappen"}
            className="mt-0.5 flex w-full items-start gap-1 rounded text-left text-xs text-ink-3 outline-none hover:text-ink-2 focus-visible:ring-2 focus-visible:ring-accent-soft"
          >
            <span className={`min-w-0 flex-1 ${expanded ? "whitespace-pre-line" : "truncate"}`}>
              {expanded ? description : hasMore ? `${preview}…` : preview}
            </span>
            {hasMore && (
              <ChevronIcon
                width={14}
                height={14}
                className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            )}
          </button>
        )}
      </div>

      {task.dueLabel && (
        <span
          className={`hidden items-center gap-1 text-xs sm:inline-flex ${
            task.overdue ? "font-medium text-bad" : "text-ink-3"
          }`}
        >
          <CalendarIcon width={13} height={13} />
          {task.dueLabel}
        </span>
      )}

      {task.priority !== "medium" && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priority.className}`}>
          {priority.label}
        </span>
      )}

      {/* Medewerkers mogen de status ook wijzigen; label toont, onzichtbare select wijzigt */}
      <label
        className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full border px-2 py-0.5 text-[11px] font-medium focus-within:ring-2 focus-within:ring-accent-soft ${statusStyle.className}`}
      >
        {statusStyle.label}
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value as TaskStatus)}
          aria-label={`Status van ${task.title}`}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {showProject &&
        (task.isOwner ? (
          // Label toont het project; de onzichtbare select erboven wijzigt het.
          <label
            className={`relative inline-flex max-w-32 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] focus-within:ring-2 focus-within:ring-accent-soft ${
              project
                ? "border-line text-ink-2 hover:bg-surface-2"
                : "border-dashed border-line text-ink-3 hover:text-ink-2"
            }`}
          >
            {project && <ProjectDot color={project.color} size={7} />}
            <span className="truncate">{project?.name ?? "Project"}</span>
            <select
              value={projectId ?? ""}
              onChange={(e) => changeProject(e.target.value)}
              aria-label={`Project voor ${task.title}`}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">Geen project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          project && (
            <span className="inline-flex max-w-32 shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-2">
              <ProjectDot color={project.color} size={7} />
              <span className="truncate">{project.name}</span>
            </span>
          )
        ))}

      {assignee && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          title={`Toegewezen aan ${assignee.name}`}
          aria-label={`Toegewezen aan ${assignee.name}`}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent ring-2 ring-surface"
        >
          {assignee.initials}
        </button>
      )}

      {task.isOwner ? (
        <button
          type="button"
          onClick={remove}
          aria-label={`${task.title} verwijderen`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-3 opacity-100 hover:bg-bad/10 hover:text-bad focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <TrashIcon width={15} height={15} />
        </button>
      ) : (
        // Zelfde breedte als de prullenbak, zodat rijen netjes uitlijnen
        <span className="h-7 w-7 shrink-0" aria-hidden />
      )}

      <TaskDialog
        mode="edit"
        dialogRef={dialogRef}
        task={task}
        status={status}
        projectId={projectId}
        projects={projects}
        members={members}
        onStatusChange={changeStatus}
        onDelete={remove}
      />
    </li>
  );
}
