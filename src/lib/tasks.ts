import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./auth";
import { displayName, initialsOf } from "./names";
import { createClient } from "./supabase/server";
import type { TaskPriority, TaskStatus } from "./supabase/database.types";
import type { ProjectColor } from "./project-colors";

export type TaskView = "open" | "done";

export type TaskItemData = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  done: boolean;
  projectId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  dueLabel: string | null;
  overdue: boolean;
  /** Alleen de eigenaar mag bewerken; een medewerker mag alleen afvinken. */
  isOwner: boolean;
  ownerName: string;
  /** Project van een ander (alleen bij taken die aan jou zijn toegewezen). */
  foreignProject: { name: string; color: ProjectColor } | null;
};

export type Project = { id: string; name: string; color: ProjectColor; openCount: number };

export type Member = { id: string; name: string; email: string; initials: string };

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const TIME_ZONE = "Europe/Amsterdam";

/** Vandaag als YYYY-MM-DD in Nederlandse tijd. */
export function todayISO(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
}

export async function getTasks(
  view: TaskView,
  filter: { projectId?: string; assigneeId?: string } = {},
): Promise<TaskItemData[]> {
  const { projectId, assigneeId } = filter;
  const supabase = await createClient();
  const today = todayISO();

  let query = supabase
    .from("tasks")
    .select("id, title, description, priority, status, done, due_date, project_id, assignee_id, user_id");
  if (projectId) query = query.eq("project_id", projectId);
  if (assigneeId) query = query.eq("assignee_id", assigneeId);
  query =
    view === "done"
      ? query.eq("done", true).order("completed_at", { ascending: false }).limit(100)
      : query
          .eq("done", false)
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

  const [{ data, error }, user, members, ownProjects] = await Promise.all([
    query,
    getCurrentUser(),
    getMembers(),
    getProjects(),
  ]);
  if (error) throw new Error(`Supabase: ${error.message}`);

  // Projecten van anderen (bij aan jou toegewezen taken) apart ophalen; RLS staat dat toe
  const ownIds = new Set(ownProjects.map((p) => p.id));
  const foreignIds = [
    ...new Set(data.map((t) => t.project_id).filter((id): id is string => !!id && !ownIds.has(id))),
  ];
  const foreign = new Map<string, { name: string; color: ProjectColor }>();
  if (foreignIds.length) {
    const res = await supabase.from("projects").select("id, name, color").in("id", foreignIds);
    if (res.error) throw new Error(`Supabase: ${res.error.message}`);
    res.data.forEach((p) => foreign.set(p.id, { name: p.name, color: p.color }));
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Onbekend";

  return data.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    done: t.done,
    projectId: t.project_id,
    assigneeId: t.assignee_id,
    dueDate: t.due_date,
    dueLabel: t.due_date ? dueLabel(t.due_date, today) : null,
    overdue: !t.done && t.due_date !== null && t.due_date < today,
    isOwner: t.user_id === user.id,
    ownerName: t.user_id === user.id ? user.name : nameOf(t.user_id),
    foreignProject: t.project_id ? (foreign.get(t.project_id) ?? null) : null,
  }));
}

/** Alle accounts: het team waaraan je taken kunt toewijzen. */
export const getMembers = cache(async (): Promise<Member[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, email, full_name");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data
    .map((p) => {
      const name = displayName(p.email, p.full_name);
      return { id: p.id, name, email: p.email, initials: initialsOf(name) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
});

export const getProjects = cache(async (): Promise<Project[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects_with_counts")
    .select("id, name, color, open_count")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data.map((p) => ({ id: p.id, name: p.name, color: p.color, openCount: p.open_count }));
});

/** Tellers voor "Mijn taken": alleen taken waar jij de medewerker bent. */
export const getTaskCounts = cache(async () => {
  const [supabase, user] = await Promise.all([createClient(), getCurrentUser()]);
  const today = todayISO();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = () =>
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assignee_id", user.id);

  const results = await Promise.all([
    count().eq("done", false),
    count().eq("done", false).lte("due_date", today),
    count().eq("done", false).lt("due_date", today),
    count().eq("done", true).gte("completed_at", weekAgo),
  ]);
  for (const r of results) if (r.error) throw new Error(`Supabase: ${r.error.message}`);

  const [open, dueToday, overdue, doneThisWeek] = results.map((r) => r.count ?? 0);
  return { open, dueToday, overdue, doneThisWeek };
});

function dueLabel(due: string, today: string) {
  if (due === today) return "Vandaag";
  if (due === todayISO(1)) return "Morgen";
  if (due === todayISO(-1)) return "Gisteren";
  const [y, m, d] = due.split("-").map(Number);
  const label = `${d} ${MONTHS[m - 1]}`;
  return y === Number(today.slice(0, 4)) ? label : `${label} ${y}`;
}
