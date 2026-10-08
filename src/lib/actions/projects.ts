"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PROJECT_COLOR_ORDER } from "@/lib/project-colors";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createProject(_prev: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Geef het project een naam.";
  if (name.length > 60) return "De naam mag maximaal 60 tekens zijn.";

  const supabase = await createClient();
  const { count } = await supabase.from("projects").select("id", { count: "exact", head: true });
  const color = PROJECT_COLOR_ORDER[(count ?? 0) % PROJECT_COLOR_ORDER.length];

  const { data, error } = await supabase.from("projects").insert({ name, color }).select("id").single();
  if (error) return "Project aanmaken is niet gelukt.";

  revalidatePath("/", "layout");
  redirect(`/?project=${data.id}`);
}

export async function deleteProject(id: string) {
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  // Taken blijven bestaan; de database zet hun project_id op null.
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error("Project verwijderen is niet gelukt.");
  revalidatePath("/", "layout");
  redirect("/");
}
