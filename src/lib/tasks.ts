import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./auth";
import { displayName, initialsOf } from "./names";
import { createClient } from "./supabase/server";
import type { TaskStatus } from "./supabase/database.types";
import type { ProjectColor } from "./project-colors";

export type TaskView = "open" | "done";

export type TaskItemData = {
  id: string;
  title: string;
  description: string | null;
  sectionId: string | null;
  /** Naam van het onderdeel, bijv. "AVN-1" of "Bugfix". */
  section: string | null;
  status: TaskStatus;
  done: boolean;
  projectId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  /** HH:MM, optioneel naast de datum. */
  dueTime: string | null;
  dueLabel: string | null;
  overdue: boolean;
  /** Datum van afronden als DD-MM-YYYY, alleen bij afgeronde taken. */
  doneLabel: string | null;
  /** Alleen de eigenaar mag bewerken; een medewerker mag alleen afvinken. */
  isOwner: boolean;
  ownerName: string;
  /** Project van een ander (alleen bij taken die aan jou zijn toegewezen). */
  foreignProject: { name: string; color: ProjectColor } | null;
};

export type Project = {
  id: string;
  name: string;
  color: ProjectColor;
  /** Onderdelen in volgorde van aanmaken, bijv. AVN-1 en Bugfix. */
  sections: Section[];
  openCount: number;
  doneCount: number;
};

export type Section = { id: string; name: string };

export type Member = { id: string; name: string; email: string; initials: string };

const TIME_ZONE = "Europe/Amsterdam";

/** Vandaag als YYYY-MM-DD in Nederlandse tijd. */
export function todayISO(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
}

export async function getTasks(
  view: TaskView,
  filter: { projectId?: string; assigneeId?: string; limit?: number } = {},
): Promise<TaskItemData[]> {
  // limit geldt alleen voor afgeronde taken; zoeken op Home haalt er meer op
  const { projectId, assigneeId, limit = 100 } = filter;
  const supabase = await createClient();
  const today = todayISO();

  let query = supabase
    .from("tasks")
    .select("id, title, description, section_id, status, done, due_date, due_time, completed_at, project_id, assignee_id, user_id");
  if (projectId) query = query.eq("project_id", projectId);
  if (assigneeId) query = query.eq("assignee_id", assigneeId);
  query =
    view === "done"
      ? query.eq("done", true).order("completed_at", { ascending: false }).limit(limit)
      : query
          .eq("done", false)
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("due_time", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

  const [{ data, error }, user, members, ownProjects, sections] = await Promise.all([
    query,
    getCurrentUser(),
    getMembers(),
    getProjects(),
    getSections(),
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
    sectionId: t.section_id,
    section: sections.find((s) => s.id === t.section_id)?.name ?? null,
    status: t.status,
    done: t.done,
    projectId: t.project_id,
    assigneeId: t.assignee_id,
    dueDate: t.due_date,
    dueTime: t.due_time?.slice(0, 5) ?? null,
    dueLabel: t.due_date ? dueLabel(t.due_date, t.due_time) : null,
    overdue: !t.done && t.due_date !== null && t.due_date < today,
    doneLabel: t.done && t.completed_at ? doneLabel(t.completed_at) : null,
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

/** Eigen projecten met het aantal open en afgeronde taken (alleen taken die jij mag zien), oudste eerst. */
export const getProjects = cache(async (): Promise<Project[]> => {
  const [supabase, user] = await Promise.all([createClient(), getCurrentUser()]);
  // Alleen eigen projecten: projecten van collega's zijn leesbaar, maar horen niet in jouw lijst
  const [projects, tasks, sections] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("tasks").select("project_id, done").not("project_id", "is", null),
    getSections(),
  ]);
  if (projects.error) throw new Error(`Supabase: ${projects.error.message}`);
  if (tasks.error) throw new Error(`Supabase: ${tasks.error.message}`);

  const counts = new Map<string, { open: number; done: number }>();
  for (const t of tasks.data) {
    if (!t.project_id) continue;
    const c = counts.get(t.project_id) ?? { open: 0, done: 0 };
    c[t.done ? "done" : "open"] += 1;
    counts.set(t.project_id, c);
  }
  return projects.data.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    sections: sections.filter((s) => s.projectId === p.id).map(({ id, name }) => ({ id, name })),
    openCount: counts.get(p.id)?.open ?? 0,
    doneCount: counts.get(p.id)?.done ?? 0,
  }));
});

/** Eigen onderdelen, plus die van taken die aan jou zijn toegewezen (RLS). Oudste eerst. */
const getSections = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sections")
    .select("id, project_id, name")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data.map((s) => ({ id: s.id, projectId: s.project_id, name: s.name }));
});

/** Tellers voor "Mijn taken": alleen taken waar jij de medewerker bent. */
export const getTaskCounts = cache(async () => {
  const [supabase, user] = await Promise.all([createClient(), getCurrentUser()]);
  const today = todayISO();
  const count = () =>
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assignee_id", user.id);

  const results = await Promise.all([
    count().eq("done", false),
    count().eq("done", false).lte("due_date", today),
    count().eq("done", true),
  ]);
  for (const r of results) if (r.error) throw new Error(`Supabase: ${r.error.message}`);

  // dueToday: open taken voor vandaag of eerder (de begroeting bovenaan)
  const [open, dueToday, done] = results.map((r) => r.count ?? 0);
  return { open, dueToday, done };
});

/** Tijdstip → DD-MM-YYYY in Nederlandse tijd. */
function doneLabel(completedAt: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(completedAt));
}

/** YYYY-MM-DD (+ HH:MM:SS) → DD-MM-YYYY (HH:MM), bijv. 2026-10-08 14:30 → 08-10-2026 14:30. */
function dueLabel(due: string, time: string | null) {
  const [y, m, d] = due.split("-");
  return time ? `${d}-${m}-${y} ${time.slice(0, 5)}` : `${d}-${m}-${y}`;
}
