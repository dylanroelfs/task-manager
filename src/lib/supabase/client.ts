import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Voor Client Components (bijv. realtime). Data ophalen gaat bij voorkeur via de server-client.
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase env-variabelen ontbreken (zie .env.example)");
  return createBrowserClient<Database>(env.url, env.key);
}
