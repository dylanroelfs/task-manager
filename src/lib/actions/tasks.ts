"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/supabase/database.types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TaskFields = {
  title: string;
  description?: string | null;
  section_id: string | null;
  due_date: string | null;
  due_time: string | null;
  project_id: string | null;
  assignee_id?: string | null;
};

function parseTaskFields(formData: FormData): TaskFields | string {
  const title = String(formData.get("title") ?? "").trim();
  const sectionId = String(formData.get("section_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const dueTime = String(formData.get("due_time") ?? "");
  const projectId = String(formData.get("project_id") ?? "");

  if (!title) return "Geef de taak een titel.";
  if (title.length > 200) return "De titel mag maximaal 200 tekens zijn.";
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return "Ongeldige datum.";
  if (dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) return "Ongeldige tijd.";
  if (dueTime && !dueDate) return "Kies ook een datum bij de tijd.";
  if (projectId && !UUID.test(projectId)) return "Ongeldig project.";
  if (sectionId && !UUID.test(sectionId)) return "Ongeldig onderdeel.";

  const fields: TaskFields = {
    title,
    due_date: dueDate || null,
    due_time: dueTime || null,
    project_id: projectId || null,
    // Alleen binnen een project; de database controleert dat het onderdeel bij dat project hoort
    section_id: (projectId && sectionId) || null,
  };
  if (formData.has("description")) {
    const description = String(formData.get("description") ?? "").trim();
    if (description.length > 2000) return "De beschrijving mag maximaal 2000 tekens zijn.";
    fields.description = description || null;
  }
  // Alleen meenemen als het formulier een medewerker-veld heeft
  if (formData.has("assignee_id")) {
    const assigneeId = String(formData.get("assignee_id") ?? "");
    if (assigneeId && !UUID.test(assigneeId)) return "Ongeldige medewerker.";
    fields.assignee_id = assigneeId || null;
  }
  return fields;
}

/** Geeft een foutmelding terug, of null als het gelukt is. */
export async function createTask(formData: FormData): Promise<string | null> {
  const fields = parseTaskFields(formData);
  if (typeof fields === "string") return fields;

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert(fields);
  if (error) return "Opslaan is niet gelukt. Probeer het opnieuw.";

  revalidatePath("/", "layout");
  return null;
}

/** Geeft een foutmelding terug, of null als het gelukt is. */
export async function updateTask(id: string, formData: FormData): Promise<string | null> {
  if (!UUID.test(id)) return "Ongeldige taak.";
  const fields = parseTaskFields(formData);
  if (typeof fields === "string") return fields;

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(fields).eq("id", id);
  if (error) return "Opslaan is niet gelukt. Probeer het opnieuw.";

  revalidatePath("/", "layout");
  return null;
}

/** done en completed_at worden in de database afgeleid van de status. */
export async function setTaskStatus(id: string, status: TaskStatus) {
  if (!UUID.test(id) || !STATUSES.includes(status)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error("Bijwerken is niet gelukt.");
  revalidatePath("/", "layout");
}

export async function deleteTask(id: string) {
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error("Verwijderen is niet gelukt.");
  revalidatePath("/", "layout");
}
