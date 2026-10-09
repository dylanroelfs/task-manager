import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNoteCount } from "@/lib/notes";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  getMembers,
  getProjects,
  getTaskCounts,
  getTasks,
  todayISO,
  type Section,
  type TaskItemData,
  type TaskView,
} from "@/lib/tasks";
import { NoteIcon } from "./icons";
import { NewTaskButton } from "./new-task-button";
import { ProjectAddMenu } from "./project-add-menu";
import { ProjectDot } from "./project-dot";
import { SearchableTaskList, TaskList } from "./task-list";
import { Topbar } from "./topbar";

export async function TasksView({
  view,
  projectId,
  showDone = false,
}: {
  view: TaskView;
  projectId?: string;
  /** Projectpagina: afgeronde taken onder de open taken tonen. */
  showDone?: boolean;
}) {
  if (!getSupabaseEnv()) return <SetupNotice />;

  const user = await getCurrentUser();
  const withDone = view === "open" && !!projectId && showDone;
  const [projects, members, openOrDone, done, noteCount, counts] = await Promise.all([
    getProjects(),
    getMembers(),
    // "Open taken": alleen waar jij medewerker bent. Een project toont al zijn taken.
    getTasks(view, projectId ? { projectId } : view === "open" ? { assigneeId: user.id } : {}),
    withDone ? getTasks("done", { projectId }) : [],
    projectId ? getNoteCount(projectId) : 0,
    getTaskCounts(),
  ]);
  // Afgeronde na de open taken, zodat ze binnen elk onderdeel onderaan staan
  const tasks = [...openOrDone, ...done];

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  if (projectId && !project) notFound();

  const title = view === "done" ? "Afgeronde taken" : "Open taken";
  const empty =
    view === "done"
      ? "Nog geen afgeronde taken."
      : project
        ? withDone
          ? "Nog geen taken in dit project."
          : "Geen open taken in dit project."
        : "Geen open taken op jouw naam. Voeg er een toe met de plusknop.";

  return (
    <>
      <Topbar
        title={project?.name ?? title}
        tags={
          project ? (
            <CountTags open={project.openCount} done={project.doneCount} />
          ) : view === "done" ? (
            <CountTag count={counts.done} title="Afgeronde taken op jouw naam" />
          ) : (
            <CountTag count={counts.open} title="Open taken op jouw naam" />
          )
        }
      />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {project ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
                <ProjectDot color={project.color} size={12} />
                {project.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {view === "open" && (
                <Link
                  href={withDone ? `/?project=${project.id}` : `/?project=${project.id}&afgerond=1`}
                  aria-pressed={withDone}
                  className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm shadow-card transition-colors ${
                    withDone
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-line-strong bg-surface text-ink-2 hover:text-ink"
                  }`}
                >
                  {withDone ? "Afgeronde verbergen" : "Afgeronde tonen"}
                </Link>
              )}
              {/* Naar Notities, met het filter op dit project aan */}
              <Link
                href={`/notities?project=${project.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink-2 shadow-card transition-colors hover:text-ink"
              >
                <NoteIcon width={15} height={15} />
                Notities
                <span className="tabular-nums text-ink-3">{noteCount}</span>
              </Link>
              {view === "open" && (
                <ProjectAddMenu
                  project={project}
                  projects={projects}
                  members={members}
                  currentUserId={user.id}
                  today={todayISO()}
                />
              )}
            </div>
          </div>
        ) : null}

        {view === "open" && project && project.sections.length > 0 && (withDone || tasks.length > 0) ? (
          // Projectpagina: een blok per onderdeel. Alleen open taken: onderdelen zonder open
          // taken vallen weg. Afgeronde tonen: alle onderdelen, ook lege.
          groupBySection(project.id, tasks, project.sections, withDone).map((part) => (
            <section key={part.key} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-sm font-medium text-ink-2">
                {part.name || "Overig"}
                <span className="text-ink-3">{part.tasks.filter((t) => !t.done).length}</span>
              </h2>
              {part.tasks.length ? (
                <TaskList tasks={part.tasks} projects={projects} members={members} />
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-center text-xs text-ink-3">
                  Nog geen taken in dit onderdeel.
                </p>
              )}
            </section>
          ))
        ) : !project ? (
          // Open en afgeronde taken: één lijst met een zoekbalk
          <SearchableTaskList
            title={title}
            action={
              view === "open" && (
                <NewTaskButton
                  compact
                  projects={projects}
                  members={members}
                  currentUserId={user.id}
                  today={todayISO()}
                />
              )
            }
            tasks={tasks}
            projects={projects}
            members={members}
            label={view === "done" ? "Zoek in afgeronde taken" : "Zoek in open taken"}
            empty={empty}
          />
        ) : tasks.length === 0 ? (
          <section className="card">
            <p className="px-4 py-12 text-center text-sm text-ink-3">{empty}</p>
          </section>
        ) : (
          <TaskList tasks={tasks} projects={projects} members={members} />
        )}
      </main>
    </>
  );
}

type SectionGroup = { key: string; sectionId: string | null; name: string; tasks: TaskItemData[] };

/**
 * Taken per onderdeel: eerst in de volgorde van het project, dan onbekende onderdelen
 * (van een project van een ander), taken zonder onderdeel als laatste onder "Overig".
 * Is er niets te verdelen, dan één groep zonder naam. withEmpty: ook lege onderdelen tonen.
 */
function groupBySection(
  projectKey: string,
  tasks: TaskItemData[],
  order: Section[],
  withEmpty: boolean,
): SectionGroup[] {
  const groups = new Map<string, SectionGroup>();
  const add = (sectionId: string | null, name: string) => {
    const key = `${projectKey}:${sectionId ?? ""}`;
    if (!groups.has(key)) groups.set(key, { key, sectionId, name, tasks: [] });
    return groups.get(key)!;
  };
  if (withEmpty) order.forEach((s) => add(s.id, s.name));
  for (const task of tasks) add(task.sectionId, task.section ?? "Overig").tasks.push(task);

  const result = [...groups.values()];
  if (result.length === 1 && !result[0].sectionId) return [{ ...result[0], key: projectKey, name: "" }];

  const rank = (g: SectionGroup) => {
    if (!g.sectionId) return Infinity;
    const i = order.findIndex((s) => s.id === g.sectionId);
    return i === -1 ? order.length : i;
  };
  return result.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "nl", { numeric: true }));
}

// Neutraal, net als de andere tellers: kleur is voorbehouden aan projecten
// Zelfde opmaak als de icoonvlakjes op Home: lichtgrijs met een dunne rand
const TAG = "rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium tabular-nums text-ink-2 ring-1 ring-inset ring-line";

/** Alleen het getal als tag. */
function CountTag({ count, title }: { count: number; title?: string }) {
  return (
    <span title={title} className={TAG}>
      {count}
    </span>
  );
}

/** "x open" en "x afgerond" als tags, voor een project. */
function CountTags({ open, done }: { open: number; done: number }) {
  return (
    <>
      <span className={TAG}>{open} open</span>
      <span className={TAG}>{done} afgerond</span>
    </>
  );
}

export function SetupNotice() {
  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 place-items-center px-4 py-16">
      <div className="card max-w-md p-6">
        <h1 className="text-lg font-semibold tracking-tight">Supabase is nog niet gekoppeld</h1>
        <p className="mt-2 text-sm text-ink-2">
          Kopieer <code className="font-mono text-xs">.env.example</code> naar{" "}
          <code className="font-mono text-xs">.env.local</code>, vul je project-URL en publishable key
          in en herstart de dev-server.
        </p>
      </div>
    </main>
  );
}
