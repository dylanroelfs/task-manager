import type { DayCount } from "@/lib/tasks";

const BAR_MAX = 120; // px, hoogste staaf

const weekday = new Intl.DateTimeFormat("nl-NL", { weekday: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** Staafjes: afgeronde taken per dag. Vandaag in de accentkleur, weekend zachter. */
export function CompletedChart({ days }: { days: DayCount[] }) {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(...days.map((d) => d.count), 1);

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink-2">Afgeronde taken</h2>
          <p className="mt-0.5 text-xs text-ink-3">Laatste {days.length} dagen</p>
        </div>
        <p className="text-right">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{total}</span>
          <span className="ml-1.5 text-xs text-ink-3">{total === 1 ? "taak" : "taken"}</span>
        </p>
      </div>

      <div className="relative mt-6">
        {/* Hulplijnen op 0, de helft en het maximum */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: BAR_MAX + 18 }}>
          <div className="border-t border-dashed border-line" />
          <div className="border-t border-dashed border-line" />
          <div className="border-t border-line" />
        </div>

        <ol className="relative flex gap-1.5 sm:gap-3">
          {days.map((d, i) => {
            // Middag UTC, zodat de dag niet verschuift
            const date = new Date(`${d.date}T12:00:00Z`);
            const today = i === days.length - 1;
            const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
            const label = `${d.count} ${d.count === 1 ? "taak" : "taken"} op ${longDate.format(date)}`;
            return (
              <li key={d.date} title={label} className="group flex min-w-0 flex-1 flex-col items-center whitespace-nowrap">
                <span className="sr-only">{label}</span>
                <div className="flex w-full flex-col items-center justify-end" style={{ height: BAR_MAX + 18 }}>
                  {d.count > 0 && (
                    <span
                      className={`mb-1.5 text-[11px] font-medium tabular-nums ${today ? "text-accent" : "text-ink-3"}`}
                    >
                      {d.count}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-10 rounded-t-md rounded-b-sm transition-colors ${
                      d.count === 0
                        ? "bg-line"
                        : today
                          ? "bg-linear-to-t from-accent to-accent-2 shadow-[0_4px_14px_-4px] shadow-accent/50"
                          : weekend
                            ? "bg-accent/15 group-hover:bg-accent/30"
                            : "bg-accent/30 group-hover:bg-accent/50"
                    }`}
                    style={{ height: d.count ? Math.max(6, Math.round((d.count / max) * BAR_MAX)) : 2 }}
                  />
                </div>
                <span
                  className={`mt-2.5 text-[11px] leading-tight ${today ? "font-medium text-accent" : "text-ink-3"}`}
                  aria-hidden
                >
                  {/* Op mobiel alleen de dag van de maand, anders past het niet */}
                  <span className="hidden sm:inline">{weekday.format(date).replace(".", "")} </span>
                  {date.getUTCDate()}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
