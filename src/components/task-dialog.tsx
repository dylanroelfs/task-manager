"use client";

import { useId, useRef, useState, useTransition, type RefObject } from "react";
import { createTask, updateTask } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { TASK_STATUSES } from "@/lib/task-status";
import type { Member, Project, Section, TaskItemData } from "@/lib/tasks";
import { CloseIcon, TrashIcon } from "./icons";

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft";

type Shared = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  projects: Project[];
  members: Member[];
};

type CreateProps = Shared & {
  mode: "create";
  defaults: { projectId?: string; assigneeId: string; dueDate: string };
};

type EditProps = Shared & {
  mode: "edit";
  task: TaskItemData;
  status: TaskStatus;
  projectId: string | null;
  onStatusChange: (status: TaskStatus) => void;
  /** Vraagt zelf om bevestiging; true als de taak verwijderd wordt. */
  onDelete: () => boolean;
};

/** Eén popup voor nieuwe taken en voor bewerken. */
export function TaskDialog(props: CreateProps | EditProps) {
  const { dialogRef, projects, members } = props;
  const task = props.mode === "edit" ? props.task : null;
  const readOnly = task !== null && !task.isOwner;

  const values =
    props.mode === "edit"
      ? {
          title: props.task.title,
          description: props.task.description ?? "",
          projectId: props.projectId ?? "",
          sectionId: props.task.sectionId ?? "",
          dueDate: props.task.dueDate ?? "",
          dueTime: props.task.dueTime ?? "",
          assigneeId: props.task.assigneeId ?? "",
        }
      : {
          title: "",
          description: "",
          projectId: props.defaults.projectId ?? "",
          sectionId: "",
          dueDate: props.defaults.dueDate,
          dueTime: "",
          assigneeId: props.defaults.assigneeId,
        };

  const headingId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function close() {
    dialogRef.current?.close();
  }

  function save(formData: FormData) {
    startSaving(async () => {
      const result = task ? await updateTask(task.id, formData) : await createTask(formData);
      if (result) setError(result);
      else close();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      // Bij sluiten (ook via Esc) niet-opgeslagen wijzigingen weggooien
      onClose={() => {
        formRef.current?.reset();
        setError(null);
      }}
      // Klik op de achtergrond sluit de popup
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/20 backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      <form
        ref={formRef}
        // Nieuwe key als de waarden van buiten veranderen, zodat de velden die tonen
        key={Object.values(values).join("|")}
        action={save}
        className="p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-sm font-medium text-ink-2">
            {!task ? "Nieuwe taak" : readOnly ? `Taak van ${task.ownerName}` : "Taak bewerken"}
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

        {/* Alleen de eigenaar mag bewerken; de database dwingt dat ook af */}
        <fieldset disabled={readOnly} className="min-w-0">
          <textarea
            name="title"
            required
            maxLength={200}
            rows={2}
            defaultValue={values.title}
            placeholder="Wat moet er gebeuren?"
            aria-label="Titel"
            // Lange zinnen lopen door op meerdere regels; Enter slaat op (geen regeleindes in titels)
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="mt-3 w-full resize-none rounded-lg bg-transparent text-lg font-medium leading-snug outline-none placeholder:text-ink-3"
          />

          <textarea
            name="description"
            maxLength={2000}
            rows={3}
            defaultValue={values.description}
            placeholder="Beschrijving (optioneel)"
            aria-label="Beschrijving"
            className={`mt-2 w-full resize-y rounded-lg bg-surface-2/60 px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-ink-3 focus:ring-4 focus:ring-accent-soft ${
              readOnly && !values.description ? "hidden" : ""
            }`}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProjectSectionFields
              projects={projects}
              initialProjectId={values.projectId}
              initialSection={
                task?.sectionId && task.section ? { id: task.sectionId, name: task.section } : null
              }
              foreignProjectName={task?.foreignProject?.name}
            />
            <label className="space-y-1.5">
              <span className="text-xs text-ink-3">Datum</span>
              <input type="date" name="due_date" defaultValue={values.dueDate} className={fieldClass} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs text-ink-3">Tijd (optioneel)</span>
              <input type="time" name="due_time" defaultValue={values.dueTime} className={fieldClass} />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs text-ink-3">Medewerker</span>
              <select name="assignee_id" defaultValue={values.assigneeId} className={fieldClass}>
                <option value="">Niemand</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {readOnly && (
          <p className="mt-4 text-xs text-ink-3">
            Deze taak is aan jou toegewezen. Alleen {task.ownerName} kan hem bewerken; jij kunt de
            status wijzigen.
          </p>
        )}

        {error && <p className="mt-4 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {props.mode === "edit" && (
            <>
              {/* Status staat los van het formulier en wordt direct opgeslagen */}
              <div
                role="radiogroup"
                aria-label="Status"
                className="inline-flex h-9 rounded-lg border border-line p-0.5"
              >
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={props.status === s.value}
                    onClick={() => {
                      if (props.status === s.value) return;
                      // Sluiten bij afronden: de taak verdwijnt dan uit de lijst met open taken
                      if (s.value === "done") close();
                      props.onStatusChange(s.value);
                    }}
                    className={`rounded-md px-2.5 text-sm ${
                      props.status === s.value
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    if (props.onDelete()) close();
                  }}
                  aria-label="Taak verwijderen"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-3 hover:border-bad/40 hover:text-bad"
                >
                  <TrashIcon width={15} height={15} />
                </button>
              )}
            </>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={close}
              className="h-9 rounded-lg px-3.5 text-sm text-ink-2 hover:bg-surface-2"
            >
              {readOnly ? "Sluiten" : "Annuleren"}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving}
                className="h-9 rounded-lg bg-ink px-4 text-sm font-medium text-surface hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Opslaan…" : task ? "Opslaan" : "Toevoegen"}
              </button>
            )}
          </div>
        </div>
      </form>
    </dialog>
  );
}

/**
 * Project en onderdeel: het onderdeel-veld toont de onderdelen van het gekozen project.
 * Staat binnen het formulier, dus de nieuwe key bij reset zet ook deze state terug.
 */
function ProjectSectionFields({
  projects,
  initialProjectId,
  initialSection,
  foreignProjectName,
}: {
  projects: Project[];
  initialProjectId: string;
  /** Onderdeel van de taak; ook kiesbaar als het bij een project van een ander hoort. */
  initialSection: Section | null;
  foreignProjectName?: string;
}) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const sameProject = projectId === initialProjectId;
  const options = [...(projects.find((p) => p.id === projectId)?.sections ?? [])];
  if (sameProject && initialSection && !options.some((s) => s.id === initialSection.id))
    options.push(initialSection);

  return (
    <>
      <label className="space-y-1.5">
        <span className="text-xs text-ink-3">Project</span>
        <select
          name="project_id"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className={fieldClass}
        >
          <option value="">Geen project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {foreignProjectName && initialProjectId && (
            <option value={initialProjectId}>{foreignProjectName}</option>
          )}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs text-ink-3">Onderdeel</span>
        <select
          name="section_id"
          // Ander project gekozen: het oude onderdeel past niet meer
          key={projectId}
          defaultValue={sameProject ? (initialSection?.id ?? "") : ""}
          className={fieldClass}
        >
          <option value="">
            {!projectId ? "Kies eerst een project" : options.length ? "Geen onderdeel" : "Nog geen onderdelen"}
          </option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
