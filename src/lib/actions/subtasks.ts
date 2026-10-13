"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Controleert de titel; geeft een foutmelding of null. */
function titleError(title: string) {
  if (!title) return "Geef de deeltaak een titel.";
  if (title.length > 200) return "Een deeltaak mag maximaal 200 tekens zijn.";
  return null;
}

/** Alleen de eigenaar van de taak (RLS). Geeft een foutmelding terug, of null als het gelukt is. */
export async function addSubtask(taskId: string, rawTitle: string): Promise<string | null> {
  if (!UUID.test(taskId)) return "Ongeldige taak.";
  const title = rawTitle.trim();
  const invalid = titleError(title);
  if (invalid) return invalid;

  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").insert({ task_id: taskId, title });
  if (error) return "Toevoegen is niet gelukt. Probeer het opnieuw.";

  revalidatePath("/", "layout");
  return null;
}

/** Eigenaar en toegewezen medewerker mogen afvinken. */
export async function setSubtaskDone(id: string, done: boolean) {
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").update({ done }).eq("id", id);
  if (error) throw new Error("Bijwerken is niet gelukt.");
  revalidatePath("/", "layout");
}

/** Alleen de eigenaar van de taak (trigger). Geeft een foutmelding terug, of null. */
export async function renameSubtask(id: string, rawTitle: string): Promise<string | null> {
  if (!UUID.test(id)) return "Ongeldige deeltaak.";
  const title = rawTitle.trim();
  const invalid = titleError(title);
  if (invalid) return invalid;

  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").update({ title }).eq("id", id);
  if (error) return "Opslaan is niet gelukt. Probeer het opnieuw.";

  revalidatePath("/", "layout");
  return null;
}

/** Alleen de eigenaar van de taak (RLS). */
export async function deleteSubtask(id: string) {
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw new Error("Verwijderen is niet gelukt.");
  revalidatePath("/", "layout");
}
