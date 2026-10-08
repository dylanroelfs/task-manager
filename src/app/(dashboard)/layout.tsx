import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getProjects, getTaskCounts } from "@/lib/tasks";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const data = getSupabaseEnv()
    ? await Promise.all([getCurrentUser(), getTaskCounts(), getProjects()])
    : null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar leest ?project= met useSearchParams; dat vraagt een Suspense-grens zodra de
          pagina statisch gebouwd wordt (bijv. bij een build zonder Supabase-variabelen) */}
      <Suspense>
        <Sidebar
          user={data?.[0] ?? null}
          openCount={data?.[1].open ?? 0}
          doneCount={data?.[1].done ?? 0}
          projects={data?.[2] ?? []}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
