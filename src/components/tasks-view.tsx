import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  getMembers,
  getProjects,
  getTaskCounts,
  getTasks,
  todayISO,
  type Member,
  type Project,
  type TaskItemData,
  type TaskView,
} from "@/lib/tasks";
import { DeleteProjectButton } from "./delete-project-button";
import { NewTaskButton } from "./new-task-button";
import { ProjectDot } from "./project-dot";
import { TaskItem } from "./task-item";
import { Topbar } from "./topbar";

export async function TasksView({ view, projectId }: { view: TaskView; projectId?: string }) {
  if (!getSupabaseEnv()) return <SetupNotice />;

  const user = await getCurrentUser();
  const [projects, members, tasks, counts] = await Promise.all([
    getProjects(),
    getMembers(),
    // "Mijn taken": alleen waar jij medewerker bent. Een project toont al zijn taken.
    getTasks(view, projectId ? { projectId } : view === "open" ? { assigneeId: user.id } : {}),
    getTaskCounts(),
  ]);

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  if (projectId && !project) notFound();

  const title = view === "done" ? "Afgerond" : "Mijn taken";
  const empty =
    view === "done"
      ? "Nog geen afgeronde taken."
      : project
        ? "Geen open taken in dit project."
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
              <p className="mt-1 text-sm text-ink-2">
                {project.openCount} open {project.openCount === 1 ? "taak" : "taken"}
              </p>
            </div>
            <DeleteProjectButton id={project.id} name={project.name} />
          </div>
        ) : view === "open" ? (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Hoi {user.name}</h1>
              <p className="mt-1 text-sm text-ink-2">
                {counts.dueToday
                  ? `Je hebt ${counts.dueToday} ${counts.dueToday === 1 ? "taak" : "taken"} voor vandaag.`
                  : "Je hebt vandaag niets meer op de planning."}
              </p>
            </div>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Open" value={counts.open} />
              <Stat label="Voor vandaag" value={counts.dueToday} />
              <Stat label="Te laat" value={counts.overdue} tone={counts.overdue ? "bad" : undefined} />
              <Stat label="Afgerond (7 dagen)" value={counts.doneThisWeek} />
            </section>
          </>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        )}

        {view === "open" && (
          <NewTaskButton
            projects={projects}
            members={members}
            currentUserId={user.id}
            defaultProjectId={project?.id}
            today={todayISO()}
          />
        )}

        {tasks.length === 0 ? (
          <section className="rounded-2xl border border-line bg-surface">
            <p className="px-4 py-12 text-center text-sm text-ink-3">{empty}</p>
          </section>
        ) : view === "open" && !project ? (
          // "Mijn taken": per project een eigen lijst; projecten zonder open taken vallen weg
          groupByProject(tasks, projects).map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-sm font-medium text-ink-2">
                {group.color && <ProjectDot color={group.color} size={8} />}
                {group.name}
                <span className="text-ink-3">{group.tasks.length}</span>
              </h2>
              <TaskList tasks={group.tasks} projects={projects} members={members} showProject={false} />
            </section>
          ))
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
  showProject,
}: {
  tasks: TaskItemData[];
  projects: Project[];
  members: Member[];
  showProject?: boolean;
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
            showProject={showProject}
          />
        ))}
      </ul>
    </section>
  );
}

type TaskGroup = {
  key: string;
  name: string;
  color: Project["color"] | null;
  tasks: TaskItemData[];
};

/** Taken zonder project eerst, daarna eigen projecten in volgorde, dan projecten van anderen. */
function groupByProject(tasks: TaskItemData[], projects: Project[]): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const key = task.projectId ?? "";
    let group = groups.get(key);
    if (!group) {
      const own = projects.find((p) => p.id === task.projectId);
      const info = own ?? task.foreignProject;
      group = { key, name: info?.name ?? "Zonder project", color: info?.color ?? null, tasks: [] };
      groups.set(key, group);
    }
    group.tasks.push(task);
  }
  const rank = (key: string) => {
    if (!key) return -1;
    const i = projects.findIndex((p) => p.id === key);
    return i === -1 ? projects.length : i;
  };
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key));
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "bad" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-ink-2">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${tone === "bad" ? "text-bad" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function SetupNotice() {
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
