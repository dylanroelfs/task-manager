import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  getMembers,
  getProjects,
  getTasks,
  todayISO,
  type Member,
  type Project,
  type Section,
  type TaskItemData,
  type TaskView,
} from "@/lib/tasks";
import { DeleteProjectButton } from "./delete-project-button";
import { NewTaskButton } from "./new-task-button";
import { ProjectDot } from "./project-dot";
import { NewSectionButton } from "./section-controls";
import { TaskItem } from "./task-item";
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
  const [projects, members, openOrDone, done] = await Promise.all([
    getProjects(),
    getMembers(),
    // "Open taken": alleen waar jij medewerker bent. Een project toont al zijn taken.
    getTasks(view, projectId ? { projectId } : view === "open" ? { assigneeId: user.id } : {}),
    withDone ? getTasks("done", { projectId }) : [],
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
        : "Geen open taken op jouw naam. Voeg hierboven een taak toe.";

  return (
    <>
      <Topbar title={project?.name ?? title} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {project ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
                <ProjectDot color={project.color} size={12} />
                {project.name}
              </h1>
              <CountTags open={project.openCount} done={project.doneCount} className="mt-2" />
            </div>
            <div className="flex items-center gap-2">
              {view === "open" && (
                <Link
                  href={withDone ? `/?project=${project.id}` : `/?project=${project.id}&afgerond=1`}
                  aria-pressed={withDone}
                  className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm ${
                    withDone
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-line bg-surface text-ink-2 hover:text-ink"
                  }`}
                >
                  {withDone ? "Afgeronde verbergen" : "Afgeronde tonen"}
                </Link>
              )}
              <DeleteProjectButton id={project.id} name={project.name} />
            </div>
          </div>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        )}

        {view === "open" && (
          <div className={`grid items-start gap-3 ${project ? "sm:grid-cols-2" : ""}`}>
            <div className="min-w-0">
              <NewTaskButton
                projects={projects}
                members={members}
                currentUserId={user.id}
                defaultProjectId={project?.id}
                today={todayISO()}
              />
            </div>
            {project && (
              <div className="min-w-0">
                <NewSectionButton projectId={project.id} sections={project.sections} />
              </div>
            )}
          </div>
        )}

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
        ) : tasks.length === 0 ? (
          <section className="rounded-2xl border border-line bg-surface">
            <p className="px-4 py-12 text-center text-sm text-ink-3">{empty}</p>
          </section>
        ) : (
          <TaskList tasks={tasks} projects={projects} members={members} />
        )}
      </main>
    </>
  );
}

function TaskList({
  tasks,
  projects,
  members,
}: {
  tasks: TaskItemData[];
  projects: Project[];
  members: Member[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <ul className="divide-y divide-line">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            projects={projects}
            members={members}
          />
        ))}
      </ul>
    </section>
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

/** "x open taken" en "x afgeronde taken" als tags. */
function CountTags({ open, done, className = "" }: { open: number; done: number; className?: string }) {
  const tag = "rounded-full px-2.5 py-0.5 text-xs font-medium";
  return (
    <span className={`inline-flex flex-wrap gap-1.5 ${className}`}>
      <span className={`${tag} bg-accent-soft text-accent`}>
        {open} open {open === 1 ? "taak" : "taken"}
      </span>
      <span className={`${tag} bg-good/10 text-good`}>
        {done} {done === 1 ? "afgeronde taak" : "afgeronde taken"}
      </span>
    </span>
  );
}

export function SetupNotice() {
  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 place-items-center px-4 py-16">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-6">
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
