"use client";

import { useRef } from "react";
import type { Member, Project } from "@/lib/tasks";
import { PlusIcon } from "./icons";
import { TaskDialog } from "./task-dialog";

export function NewTaskButton({
  projects,
  members,
  currentUserId,
  defaultProjectId,
  today,
  compact = false,
}: {
  projects: Project[];
  members: Member[];
  currentUserId: string;
  defaultProjectId?: string;
  /** Vandaag (YYYY-MM-DD, Nederlandse tijd), standaard datum */
  today: string;
  /** Kleine plusknop (naast een paginatitel) in plaats van de brede knop. */
  compact?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open() {
    dialogRef.current?.showModal();
    // Direct kunnen typen: focus in het titelveld
    dialogRef.current?.querySelector<HTMLTextAreaElement>('textarea[name="title"]')?.focus();
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={open}
          title="Nieuwe taak"
          aria-label="Nieuwe taak"
          className="icon-button"
        >
          <PlusIcon width={18} height={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={open}
          className="flex w-full items-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface px-4 py-3.5 text-sm text-ink-3 transition-colors hover:border-accent/50 hover:text-ink-2"
        >
          <PlusIcon width={18} height={18} />
          Nieuwe taak
        </button>
      )}
      <TaskDialog
        mode="create"
        dialogRef={dialogRef}
        projects={projects}
        members={members}
        defaults={{ projectId: defaultProjectId, assigneeId: currentUserId, dueDate: today }}
      />
    </>
  );
}
