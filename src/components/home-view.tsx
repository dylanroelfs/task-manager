import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getNoteProjectIds } from "@/lib/notes";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  getCompletedPerDay,
  getProjects,
  getReadableProjects,
  getTaskCounts,
  getTaskRows,
  type DayCount,
} from "@/lib/tasks";
import { CompletedChart } from "./completed-chart";
import { ProjectPie, type PieEntry } from "./project-pie";
import { CheckCircleIcon, ListIcon, NoteIcon } from "./icons";
import { SetupNotice } from "./tasks-view";
import { Topbar } from "./topbar";

export async function HomeView() {
  if (!getSupabaseEnv()) return <SetupNotice />;

  // Alleen wat Home nodig heeft, en alles tegelijk: geen volledige taken of notities
  const [user, counts, perDay, projects, readable, taskRows, noteProjectIds] = await Promise.all([
    getCurrentUser(),
    getTaskCounts(),
    getCompletedPerDay(10),
    getProjects(),
    getReadableProjects(),
    getTaskRows(),
    getNoteProjectIds(),
  ]);

  // Project per taak en notitie voor de taartgrafieken. Eigen projecten met hun kleur uit de
  // sidebar, die van anderen met hun opgeslagen kleur; onbekend telt als "Geen project".
  const projectOf = (id: string | null): PieEntry => {
    if (!id) return null;
    const project = projects.find((p) => p.id === id) ?? readable.find((p) => p.id === id);
    return project ? { id, name: project.name, color: project.color } : null;
  };
  const taskProjects = taskRows.map((t) => projectOf(t.project_id));
  const noteProjects = noteProjectIds.map((id) => (projects.some((p) => p.id === id) ? projectOf(id) : null));
  // Zelfde taken als de getallen op de kaarten: alleen taken op jouw naam
  const projectCount = (done: boolean) =>
    new Set(
      taskRows.filter((t) => t.assignee_id === user.id && t.done === done && t.project_id).map((t) => t.project_id),
    ).size;

  return (
    <HomeDashboard
      userName={user.name}
      counts={counts}
      noteCount={noteProjectIds.length}
      openProjectCount={projectCount(false)}
      doneProjectCount={projectCount(true)}
      perDay={perDay}
      taskProjects={taskProjects}
      noteProjects={noteProjects}
    />
  );
}

/** Weergave van Home, los van het ophalen van de data. */
export function HomeDashboard({
  userName,
  counts,
  noteCount,
  openProjectCount,
  doneProjectCount,
  perDay,
  taskProjects,
  noteProjects,
}: {
  userName: string;
  counts: { open: number; dueToday: number; done: number };
  noteCount: number;
  /** Aantal projecten waarover je open en afgeronde taken verdeeld zijn. */
  openProjectCount: number;
  doneProjectCount: number;
  perDay: DayCount[];
  taskProjects: PieEntry[];
  noteProjects: PieEntry[];
}) {
  const noteProjectCount = new Set(noteProjects.filter((p) => p !== null).map((p) => p.id)).size;

  return (
    <>
      <Topbar title="Home" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div>
          <p className="text-sm text-ink-3">{todayLabel()}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {greeting()}, {userName.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            {counts.open
              ? `Je hebt ${counts.open} open ${counts.open === 1 ? "taak" : "taken"}, waarvan ${
                  counts.dueToday || "er geen"
                } voor vandaag op de planning ${counts.dueToday === 1 ? "staat" : "staan"}.`
              : "Je hebt geen open taken."}
          </p>
        </div>
        {/* Kaarten en grafieken: overal dezelfde tussenruimte */}
        <div className="space-y-3">
          <section className="grid gap-3 sm:grid-cols-3">
            <StatLink
              href="/open"
              label="Open taken"
              value={counts.open}
              hint={spreadOver(openProjectCount, "Nog niet bij een project")}
              icon={<ListIcon width={16} height={16} />}
            />
            <StatLink
              href="/afgerond"
              label="Afgeronde taken"
              value={counts.done}
              hint={spreadOver(doneProjectCount, "Nog niet bij een project")}
              icon={<CheckCircleIcon width={16} height={16} />}
            />
            <StatLink
              href="/notities"
              label="Notities"
              value={noteCount}
              hint={spreadOver(noteProjectCount, "Nog niet bij een project")}
              icon={<NoteIcon width={16} height={16} />}
            />
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            <ProjectPie entries={taskProjects} title="Taken per project" subtitle="Open en afgerond" noun={["taak", "taken"]} />
            <ProjectPie entries={noteProjects} title="Notities per project" noun={["notitie", "notities"]} />
          </div>
          <CompletedChart days={perDay} />
        </div>
      </main>
    </>
  );
}

/** "Verdeeld over 3 projecten", of de alternatieve tekst bij 0. */
function spreadOver(count: number, none: string) {
  return count ? `Verdeeld over ${count} ${count === 1 ? "project" : "projecten"}` : none;
}

/** Vandaag als "Vrijdag 9 oktober", in Nederlandse tijd. */
function todayLabel() {
  const label = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
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
  hint,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  /** Kleine regel onder het getal, bijv. "2 voor vandaag". */
  hint: string;
  icon: React.ReactNode;
}) {
  // Neutraal: kleur is voorbehouden aan projecten
  const chip = "place-items-center rounded-lg bg-surface-2 text-ink-2 ring-1 ring-inset ring-line";
  return (
    <Link
      href={href}
      // Mobiel: één compacte regel (icoon, label, getal); vanaf sm een kaart met groot getal
      className="card group relative flex items-center gap-3 p-[1.2rem] transition-all hover:-translate-y-px hover:shadow-pop sm:block"
    >
      <span className={`grid h-9 w-9 shrink-0 sm:hidden ${chip}`}>{icon}</span>
      <div className="min-w-0 flex-1 sm:pr-10">
        <p className="text-sm font-medium text-ink-2">{label}</p>
        <p className="mt-0.5 truncate text-xs text-ink-3 sm:hidden">{hint}</p>
      </div>
      {/* Los in de hoek, zodat het vlakje de afstand tussen naam en getal niet oprekt */}
      <span className={`absolute right-[1.2rem] top-[1.2rem] hidden h-8 w-8 sm:grid ${chip}`}>{icon}</span>
      <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums sm:mt-3 sm:text-[32px]">
        {value}
      </p>
      <p className="mt-2 hidden text-xs text-ink-3 sm:block">{hint}</p>
    </Link>
  );
}
