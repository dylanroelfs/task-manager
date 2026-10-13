"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { addSubtask, deleteSubtask, renameSubtask, setSubtaskDone } from "@/lib/actions/subtasks";
import type { Subtask } from "@/lib/tasks";
import { CheckIcon, CloseIcon, PlusIcon } from "./icons";

type Change =
  | { type: "add"; subtask: Subtask }
  | { type: "done"; id: string; done: boolean }
  | { type: "rename"; id: string; title: string }
  | { type: "delete"; id: string };

function applyChange(list: Subtask[], change: Change): Subtask[] {
  switch (change.type) {
    case "add":
      return [...list, change.subtask];
    case "done":
      return list.map((s) => (s.id === change.id ? { ...s, done: change.done } : s));
    case "rename":
      return list.map((s) => (s.id === change.id ? { ...s, title: change.title } : s));
    case "delete":
      return list.filter((s) => s.id !== change.id);
  }
}

/**
 * Afvinklijst in de taak-popup. Elke wijziging wordt meteen opgeslagen, los van het
 * formulier (zoals de status). Toevoegen, hernoemen en verwijderen alleen voor de eigenaar;
 * afvinken mag ook de toegewezen medewerker. De database dwingt dat ook af.
 */
export function SubtaskList({
  taskId,
  subtasks,
  canEdit,
}: {
  taskId: string;
  subtasks: Subtask[];
  canEdit: boolean;
}) {
  const [items, apply] = useOptimistic(subtasks, applyChange);
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Esc tijdens hernoemen: niet opslaan bij het verlaten van het veld
  const cancelRename = useRef(false);

  if (!canEdit && items.length === 0) return null;
  const doneCount = items.filter((s) => s.done).length;

  function run(change: Change, save: () => Promise<string | null | void>) {
    setError(null);
    startTransition(async () => {
      apply(change);
      try {
        const result = await save();
        if (result) setError(result);
      } catch {
        setError("Opslaan is niet gelukt. Probeer het opnieuw.");
      }
    });
  }

  function add() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    run({ type: "add", subtask: { id: `nieuw-${Date.now()}`, title, done: false } }, () =>
      addSubtask(taskId, title),
    );
  }

  function finishRename(subtask: Subtask, value: string) {
    setEditingId(null);
    const title = value.trim();
    if (cancelRename.current || !title || title === subtask.title) return;
    run({ type: "rename", id: subtask.id, title }, () => renameSubtask(subtask.id, title));
  }

  return (
    // Zelfde blok als Notitie in de taak-popup; de rijen zoals de lijst met open taken
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
        <h3 className="text-xs font-medium text-ink-2">Deeltaken</h3>
        {items.length > 0 && (
          <span className="text-xs text-ink-3 tabular-nums">
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      <ul className="divide-y divide-line border-t border-line">
        {items.map((s) => (
          <li key={s.id} className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2/60">
            <button
              type="button"
              role="checkbox"
              aria-checked={s.done}
              aria-label={s.done ? `${s.title} als open markeren` : `${s.title} afvinken`}
              onClick={() => run({ type: "done", id: s.id, done: !s.done }, () => setSubtaskDone(s.id, !s.done))}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                s.done ? "border-accent bg-accent text-white" : "border-ink-3/60 hover:border-accent"
              }`}
            >
              {s.done && <CheckIcon width={12} height={12} strokeWidth={3} />}
            </button>

            {editingId === s.id ? (
              <input
                autoFocus
                defaultValue={s.title}
                maxLength={200}
                aria-label="Deeltaak"
                onFocus={() => (cancelRename.current = false)}
                onBlur={(e) => finishRename(s, e.currentTarget.value)}
                onKeyDown={(e) => {
                  // Enter slaat de deeltaak op (niet de hele taak); Esc annuleert (popup blijft open)
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.preventDefault();
                    cancelRename.current = e.key === "Escape";
                    e.currentTarget.blur();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            ) : canEdit ? (
              <button
                type="button"
                onClick={() => setEditingId(s.id)}
                title="Wijzigen"
                className={`min-w-0 flex-1 text-left text-sm [overflow-wrap:anywhere] hover:text-accent ${
                  s.done ? "text-ink-3 line-through" : ""
                }`}
              >
                {s.title}
              </button>
            ) : (
              <span className={`min-w-0 flex-1 text-sm [overflow-wrap:anywhere] ${s.done ? "text-ink-3 line-through" : ""}`}>
                {s.title}
              </span>
            )}

            {canEdit && editingId !== s.id && (
              <button
                type="button"
                onClick={() => run({ type: "delete", id: s.id }, () => deleteSubtask(s.id))}
                aria-label={`Deeltaak ${s.title} verwijderen`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-3 hover:text-bad sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <CloseIcon width={13} height={13} />
              </button>
            )}
          </li>
        ))}

        {canEdit && (
          <li className="flex items-center gap-3 px-3.5 py-3 text-ink-3">
            {/* Zelfde breedte als het rondje, zodat de tekst gelijk staat */}
            <span className="grid h-5 w-5 shrink-0 place-items-center">
              <PlusIcon width={16} height={16} />
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={200}
              placeholder="Deeltaak toevoegen…"
              aria-label="Deeltaak toevoegen"
              onKeyDown={(e) => {
                // Enter voegt toe en houdt de cursor hier voor de volgende (niet de taak opslaan)
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </li>
        )}
      </ul>

      {error && <p className="border-t border-line px-3.5 py-2 text-xs text-bad">{error}</p>}
    </section>
  );
}
