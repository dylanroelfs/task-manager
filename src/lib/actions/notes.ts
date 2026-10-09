"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NoteFields = {
  title: string;
  body: string;
  project_id: string | null;
  section_id: string | null;
};

function parseNoteFields(formData: FormData): NoteFields | string {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");

  if (!title) return "Geef de notitie een titel.";
  if (title.length > 200) return "De titel mag maximaal 200 tekens zijn.";
  if (body.length > 10000) return "De notitie mag maximaal 10.000 tekens zijn.";
  if (projectId && !UUID.test(projectId)) return "Ongeldig project.";
  if (sectionId && !UUID.test(sectionId)) return "Ongeldig onderdeel.";

  return {
    title,
    body,
    project_id: projectId || null,
    // Alleen binnen een project; de database controleert dat het onderdeel bij dat project hoort
    section_id: (projectId && sectionId) || null,
  };
}

/** Geeft een foutmelding terug, of null als het gelukt is. */
export async function createNote(formData: FormData): Promise<string | null> {
  const fields = parseNoteFields(formData);
  if (typeof fields === "string") return fields;

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert(fields);
  if (error) return "Opslaan is niet gelukt. Probeer het opnieuw.";

  revalidatePath("/", "layout");
  return null;
}

/** Geeft een foutmelding terug, of null als het gelukt is. */
export async function updateNote(id: string, formData: FormData): Promise<string | null> {
  if (!UUID.test(id)) return "Ongeldige notitie.";
  const fields = parseNoteFields(formData);
  if (typeof fields === "string") return fields;

  const supabase = await createClient();
  const { error } = await supabase.from("notes").update(fields).eq("id", id);
  if (error) return "Opslaan is niet gelukt. Probeer het opnieuw.";

  revalidatePath("/", "layout");
  return null;
}

export async function deleteNote(id: string) {
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error("Verwijderen is niet gelukt.");
  revalidatePath("/", "layout");
}
