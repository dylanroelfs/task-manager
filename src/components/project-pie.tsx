import { PROJECT_COLORS, type ProjectColor } from "@/lib/project-colors";

type Slice = { key: string; name: string; color: ProjectColor | null; count: number };

/** Project van één taak of notitie; null = geen (bekend) project. */
export type PieEntry = { id: string; name: string; color: ProjectColor } | null;

/** Aantal per project, grootste eerst; items zonder project als laatste. */
function slicesOf(entries: PieEntry[]): Slice[] {
  const slices = new Map<string, Slice>();
  for (const project of entries) {
    const key = project?.id ?? "";
    const slice = slices.get(key) ?? {
      key,
      name: project?.name ?? "Geen project",
      color: project?.color ?? null,
      count: 0,
    };
    slice.count += 1;
    slices.set(key, slice);
  }
  return [...slices.values()].sort((a, b) => (!a.key ? 1 : !b.key ? -1 : b.count - a.count));
}

/** Ruimte tussen twee stukken van de donut, op een omtrek van 100. */
const GAP = 1.2;

/**
 * Donut: hoeveel taken of notities bij elk project horen. Cirkel met omtrek 100, zodat
 * een percentage direct de lengte van het stuk is. Het totaal staat in het midden.
 */
export function ProjectPie({
  entries,
  title,
  subtitle,
  noun,
}: {
  entries: PieEntry[];
  title: string;
  subtitle?: string;
  /** Enkelvoud en meervoud, bijv. ["taak", "taken"]. */
  noun: [string, string];
}) {
  const slices = slicesOf(entries);
  const total = entries.length;
  const unit = (n: number) => (n === 1 ? noun[0] : noun[1]);
  const pct = (n: number) => Math.round((n / total) * 100);
  const gap = slices.length > 1 ? GAP : 0;
  // Lengte en startpunt van elk stuk op de cirkel (omtrek 100), met een kleine opening ertussen
  const arcs = slices.map((s, i) => ({
    ...s,
    length: Math.max((s.count / total) * 100 - gap, 0.4),
    start: slices.slice(0, i).reduce((sum, prev) => sum + (prev.count / total) * 100, 0) + gap / 2,
  }));

  return (
    // min-w-0: anders rekt de lange projectnaam in de legenda de rasterkolom op
    <section className="card h-full min-w-0 p-[1.2rem]">
      <h2 className="text-sm font-medium text-ink-2">{title}</h2>
      {/* Altijd een regel, ook zonder ondertitel: zo staan de cirkels van naast elkaar
          geplaatste kaarten op dezelfde hoogte */}
      <p className="mt-0.5 min-h-4 text-xs leading-4 text-ink-3">{subtitle}</p>

      {total === 0 ? (
        <p className="py-12 text-center text-xs text-ink-3">Nog geen {noun[1]}.</p>
      ) : (
        <div className="mt-5 flex items-center gap-5 sm:gap-6">
          <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
            <svg
              viewBox="0 0 42 42"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`${title}, ${total} in totaal`}
            >
              <circle cx="21" cy="21" r="15.915" fill="none" strokeWidth="4.5" className="stroke-surface-2" />
              {arcs.map((s) => (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="none"
                  strokeWidth="4.5"
                  strokeLinecap="butt"
                  strokeDasharray={`${s.length} ${100 - s.length}`}
                  strokeDashoffset={-s.start}
                  stroke={s.color ? PROJECT_COLORS[s.color] : "currentColor"}
                  className={s.color ? undefined : "text-ink-3/35"}
                >
                  <title>{`${s.name}: ${s.count} ${unit(s.count)} (${pct(s.count)}%)`}</title>
                </circle>
              ))}
            </svg>
            {/* Totaal in het midden */}
            <div className="absolute inset-0 grid place-content-center text-center">
              <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums">{total}</span>
              <span className="mt-1 text-[11px] text-ink-3">{unit(total)}</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-2.5">
            {slices.map((s) => (
              <li key={s.key} className="text-xs">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${s.color ? "" : "bg-ink-3/35"}`}
                    style={s.color ? { background: PROJECT_COLORS[s.color] } : undefined}
                  />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{s.name}</span>
                  <span className="shrink-0 tabular-nums text-ink">{s.count}</span>
                  <span className="w-9 shrink-0 text-right tabular-nums text-ink-3">{pct(s.count)}%</span>
                </div>
                {/* Dunne balk met het aandeel, onder de naam */}
                <div className="ml-4 mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${s.color ? "" : "bg-ink-3/35"}`}
                    style={{
                      width: `${pct(s.count)}%`,
                      background: s.color ? PROJECT_COLORS[s.color] : undefined,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
