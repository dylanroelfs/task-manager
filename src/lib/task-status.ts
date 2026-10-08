import type { TaskStatus } from "./supabase/database.types";

// Volgorde = volgorde in de keuzelijsten
export const TASK_STATUSES: { value: TaskStatus; label: string; className: string }[] = [
  { value: "todo", label: "Te doen", className: "border-line text-ink-2" },
  { value: "in_progress", label: "Bezig", className: "border-accent/40 bg-accent-soft text-accent" },
  { value: "done", label: "Afgerond", className: "border-line bg-surface-2 text-ink-3" },
];

export function statusInfo(status: TaskStatus) {
  return TASK_STATUSES.find((s) => s.value === status) ?? TASK_STATUSES[0];
}
