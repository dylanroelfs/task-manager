"use client";

import { useRef, useState } from "react";
import type { Member, Project } from "@/lib/tasks";
import { ListIcon, PlusIcon } from "./icons";
import { SectionDialog } from "./section-controls";
import { TaskDialog } from "./task-dialog";
import { useDismiss } from "./use-dismiss";

/** Plusknop op de projectpagina met een keuze: nieuwe taak of nieuw onderdeel. */
export function ProjectAddMenu({
  project,
  projects,
  members,
  currentUserId,
  today,
}: {
  project: Project;
  projects: Project[];
  members: Member[];
  currentUserId: string;
  /** Vandaag (YYYY-MM-DD, Nederlandse tijd), standaard datum van een nieuwe taak */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const taskRef = useRef<HTMLDialogElement>(null);
  const sectionRef = useRef<HTMLDialogElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  /** Opent een popup en zet de cursor in het eerste veld. */
  function show(dialog: HTMLDialogElement | null, field: string) {
    setOpen(false);
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>(field)?.focus();
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Toevoegen"
        aria-label="Toevoegen"
        className={`icon-button ${open ? "border-accent/40! bg-accent-soft! text-accent!" : ""}`}
      >
        <PlusIcon width={18} height={18} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => show(taskRef.current, 'textarea[name="title"]')}
            className={item}
          >
            <PlusIcon width={16} height={16} className="text-ink-3" />
            Nieuwe taak
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => show(sectionRef.current, "input")}
            className={item}
          >
            <ListIcon width={16} height={16} className="text-ink-3" />
            Nieuw onderdeel
          </button>
        </div>
      )}

      <TaskDialog
        mode="create"
        dialogRef={taskRef}
        projects={projects}
        members={members}
        defaults={{ projectId: project.id, assigneeId: currentUserId, dueDate: today }}
      />
      <SectionDialog dialogRef={sectionRef} projectId={project.id} sections={project.sections} />
    </div>
  );
}
