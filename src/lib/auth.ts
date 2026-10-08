import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { avatarOf } from "./avatars";
import { displayName, initialsOf } from "./names";
import { createClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  initials: string;
  /** Pad naar de profielfoto, of null (dan initialen). */
  avatarUrl: string | null;
};

// Eén keer per request, ook als layout en pagina hem allebei aanroepen.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const email = claims.email ?? "";
  const name = displayName(email, claims.user_metadata?.full_name);
  return { id: claims.sub, email, name, initials: initialsOf(name), avatarUrl: avatarOf(email) };
});
