import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Voor Server Components, Server Functions en Route Handlers.
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase env-variabelen ontbreken (zie .env.example)");

  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Aangeroepen vanuit een Server Component: cookies zijn daar read-only.
          // Geen probleem, src/proxy.ts ververst de sessie al bij elk verzoek.
        }
      },
    },
  });
}
