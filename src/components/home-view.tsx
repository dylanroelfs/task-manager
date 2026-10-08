import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getMembers, getProjects, getTaskCounts, getTasks } from "@/lib/tasks";
import { CheckCircleIcon, ListIcon } from "./icons";
import { TaskSearch } from "./task-search";
import { SetupNotice } from "./tasks-view";
import { Topbar } from "./topbar";

export async function HomeView() {
  if (!getSupabaseEnv()) return <SetupNotice />;

  const [user, counts, projects, members, open, done] = await Promise.all([
    getCurrentUser(),
    getTaskCounts(),
    getProjects(),
    getMembers(),
    // Alle taken die je mag zien (eigen en aan jou toegewezen), voor het zoeken
    getTasks("open"),
    getTasks("done", { limit: 1000 }),
  ]);

  return (
    <>
      <Topbar title="Home" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()} {user.name}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {counts.open
              ? `Je hebt ${counts.open} open ${counts.open === 1 ? "taak" : "taken"}, waarvan ${
                  counts.dueToday || "geen"
                } voor vandaag.`
              : "Je hebt geen open taken."}
          </p>
        </div>
        <section className="grid grid-cols-2 gap-3">
          <StatLink href="/open" label="Open taken" value={counts.open} icon={<ListIcon />} />
          <StatLink href="/afgerond" label="Afgeronde taken" value={counts.done} icon={<CheckCircleIcon />} />
        </section>
        <TaskSearch tasks={[...open, ...done]} projects={projects} members={members} />
      </main>
    </>
  );
}

/** Begroeting op basis van het uur in Nederlandse tijd. */
function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  if (hour >= 6 && hour < 12) return "Goedemorgen";
  if (hour >= 12 && hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

function StatLink({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent/50"
    >
      <p className="flex items-center justify-between gap-2 text-xs text-ink-2">
        {label}
        <span className="text-ink-3 group-hover:text-accent">{icon}</span>
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </Link>
  );
}
