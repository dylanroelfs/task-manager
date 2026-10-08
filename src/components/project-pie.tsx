import { PROJECT_COLORS, type ProjectColor } from "@/lib/project-colors";
import type { Project, TaskItemData } from "@/lib/tasks";

type Slice = { key: string; name: string; color: ProjectColor | null; count: number };

/** Taken per project (open en afgerond), grootste eerst; taken zonder project als laatste. */
function slicesOf(tasks: TaskItemData[], projects: Project[]): Slice[] {
  const slices = new Map<string, Slice>();
  for (const task of tasks) {
    const project = projects.find((p) => p.id === task.projectId) ?? task.foreignProject;
    const key = task.projectId && project ? task.projectId : "";
    const slice = slices.get(key) ?? {
      key,
      name: project && key ? project.name : "Geen project",
      color: project && key ? project.color : null,
      count: 0,
    };
    slice.count += 1;
    slices.set(key, slice);
  }
  return [...slices.values()].sort((a, b) => (!a.key ? 1 : !b.key ? -1 : b.count - a.count));
}

/**
 * Donut: hoeveel van al je taken bij elk project hoort. Cirkel met omtrek 100, zodat
 * een percentage direct de lengte van het stuk is.
 */
export function ProjectPie({ tasks, projects }: { tasks: TaskItemData[]; projects: Project[] }) {
  const slices = slicesOf(tasks, projects);
  const total = tasks.length;
  const pct = (n: number) => Math.round((n / total) * 100);
  // Lengte en startpunt van elk stuk op de cirkel (omtrek 100)
  const arcs = slices.map((s, i) => ({
    ...s,
    length: (s.count / total) * 100,
    start: slices.slice(0, i).reduce((sum, prev) => sum + (prev.count / total) * 100, 0),
  }));

  return (
    <section className="h-full rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs text-ink-2">Taken per project (open + afgerond)</h2>
        <p className="shrink-0 text-xs text-ink-3">
          <span className="font-medium text-ink">{total}</span> {total === 1 ? "taak" : "taken"}
        </p>
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-xs text-ink-3">Nog geen taken.</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <svg
            viewBox="0 0 42 42"
            className="h-28 w-28 shrink-0 -rotate-90"
            role="img"
            aria-label={`Taken per project, ${total} in totaal (open + afgerond)`}
          >
            <circle cx="21" cy="21" r="15.915" fill="none" strokeWidth="6" className="stroke-line" />
            {arcs.map((s) => (
              <circle
                key={s.key}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                strokeWidth="6"
                strokeDasharray={`${s.length} ${100 - s.length}`}
                strokeDashoffset={-s.start}
                stroke={s.color ? PROJECT_COLORS[s.color] : "currentColor"}
                className={s.color ? undefined : "text-ink-3/40"}
              >
                <title>{`${s.name}: ${s.count} ${s.count === 1 ? "taak" : "taken"} (${pct(s.count)}%)`}</title>
              </circle>
            ))}
          </svg>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {slices.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${s.color ? "" : "bg-ink-3/40"}`}
                  style={s.color ? { background: PROJECT_COLORS[s.color] } : undefined}
                />
                <span className="min-w-0 flex-1 truncate text-ink-2">{s.name}</span>
                <span className="shrink-0 tabular-nums text-ink-3">
                  {s.count} {s.count === 1 ? "taak" : "taken"} ({pct(s.count)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
