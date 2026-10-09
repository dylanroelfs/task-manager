import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { getProjects, TIME_ZONE } from "./tasks";

export type NoteData = {
  id: string;
  title: string;
  body: string;
  projectId: string | null;
  sectionId: string | null;
  /** Naam van het onderdeel, bijv. "Bugfix". */
  section: string | null;
  /** Aangemaakt als DD-MM-YYYY HH:MM. */
  createdLabel: string;
};

/** Eigen notities, nieuwste eerst. */
export async function getNotes(): Promise<NoteData[]> {
  const supabase = await createClient();
  const query = supabase
    .from("notes")
    .select("id, title, body, project_id, section_id, created_at")
    .order("created_at", { ascending: false });

  const [{ data, error }, projects] = await Promise.all([query, getProjects()]);
  if (error) throw new Error(`Supabase: ${error.message}`);

  const sections = projects.flatMap((p) => p.sections);
  return data.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    projectId: n.project_id,
    sectionId: n.section_id,
    section: sections.find((s) => s.id === n.section_id)?.name ?? null,
    createdLabel: timeLabel(n.created_at),
  }));
}

/** Aantal eigen notities, voor de sidebar en Home; met projectId alleen die van dat project. */
export const getNoteCount = cache(async (projectId?: string) => {
  const supabase = await createClient();
  let query = supabase.from("notes").select("id", { count: "exact", head: true });
  if (projectId) query = query.eq("project_id", projectId);
  const { count, error } = await query;
  if (error) throw new Error(`Supabase: ${error.message}`);
  return count ?? 0;
});

/** Alleen het project van elke eigen notitie, voor de grafiek op Home. */
export const getNoteProjectIds = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("project_id");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data.map((n) => n.project_id);
});

/** Tijdstip → DD-MM-YYYY HH:MM in Nederlandse tijd. */
function timeLabel(timestamp: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(timestamp))
    .replace(",", "");
}
