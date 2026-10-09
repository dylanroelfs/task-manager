"use client";

import { useRef, useState } from "react";
import type { ProjectColor } from "@/lib/project-colors";
import { CheckIcon, FilterIcon } from "./icons";
import { ProjectDot } from "./project-dot";
import { useDismiss } from "./use-dismiss";

/** Filterwaarde voor items zonder project. */
export const NO_PROJECT = "none";

export type ProjectOption = { id: string; name: string; color: ProjectColor | null };

/**
 * Keuzes voor het filter uit de projecten van de getoonde items (null = geen project):
 * elk project één keer, op naam, en "Geen project" als laatste als dat voorkomt.
 */
export function projectOptions(entries: ({ id: string; name: string; color: ProjectColor } | null)[]) {
  const byId = new Map<string, ProjectOption>();
  let withoutProject = false;
  for (const entry of entries) {
    if (entry) byId.set(entry.id, entry);
    else withoutProject = true;
  }
  const options = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "nl", { numeric: true }));
  if (withoutProject) options.push({ id: NO_PROJECT, name: "Geen project", color: null });
  return options;
}

/** Past het item bij het gekozen filter? null = alle projecten. */
export function inProject(projectId: string | null, filter: string | null) {
  if (filter === null) return true;
  return filter === NO_PROJECT ? projectId === null : projectId === filter;
}

/** Filterknop met een uitklapmenu om op één project te filteren. */
export function ProjectFilter({
  options,
  value,
  onChange,
}: {
  options: ProjectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  // Klik buiten het menu of Esc sluit het
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Filter op project"
        aria-label={selected ? `Filter op project: ${selected.name}` : "Filter op project"}
        className={`icon-button flex! w-auto! min-w-9 items-center gap-2 px-2.5 text-sm ${
          selected ? "border-accent/40! bg-accent-soft! text-accent!" : ""
        }`}
      >
        <FilterIcon width={18} height={18} />
        {selected && <span className="max-w-36 truncate pr-0.5">{selected.name}</span>}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Project"
          className="absolute right-0 top-full z-30 mt-1.5 max-h-80 w-60 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-3">
            Project
          </p>
          {[{ id: null, name: "Alle projecten", color: null }, ...options].map((o) => (
            <button
              key={o.id ?? "all"}
              type="button"
              role="menuitemradio"
              aria-checked={o.id === (selected?.id ?? null)}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <span className="grid w-4 shrink-0 place-items-center text-accent">
                {o.id === (selected?.id ?? null) && <CheckIcon width={15} height={15} strokeWidth={2.25} />}
              </span>
              {o.color && <ProjectDot color={o.color} />}
              <span className="min-w-0 truncate">{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
