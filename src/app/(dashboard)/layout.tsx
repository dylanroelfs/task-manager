import { Suspense } from "react";
import { AppPanel } from "@/components/app-panel";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getNoteCount } from "@/lib/notes";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getProjects, getTaskCounts } from "@/lib/tasks";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const data = getSupabaseEnv()
    ? await Promise.all([getCurrentUser(), getTaskCounts(), getProjects(), getNoteCount()])
    : null;

  return (
    <div className="flex min-h-screen bg-page">
      {/* Sidebar leest ?project= met useSearchParams; dat vraagt een Suspense-grens zodra de
          pagina statisch gebouwd wordt (bijv. bij een build zonder Supabase-variabelen) */}
      <Suspense>
        <Sidebar
          user={data?.[0] ?? null}
          openCount={data?.[1].open ?? 0}
          doneCount={data?.[1].done ?? 0}
          projects={data?.[2] ?? []}
          noteCount={data?.[3] ?? 0}
        />
      </Suspense>
      <AppPanel>{children}</AppPanel>
    </div>
  );
}
