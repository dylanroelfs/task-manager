import type { DayCount } from "@/lib/tasks";

const BAR_MAX = 88; // px, hoogste staaf

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
    <section className="h-full rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs text-ink-2">Afgerond, laatste {days.length} dagen</h2>
        <p className="text-xs text-ink-3">
          <span className="font-medium text-ink">{total}</span> {total === 1 ? "taak" : "taken"}
        </p>
      </div>

      <ol className="mt-4 flex gap-1.5 sm:gap-2">
        {days.map((d, i) => {
          // Middag UTC, zodat de dag niet verschuift
          const date = new Date(`${d.date}T12:00:00Z`);
          const today = i === days.length - 1;
          const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
          const label = `${d.count} ${d.count === 1 ? "taak" : "taken"} op ${longDate.format(date)}`;
          return (
            <li key={d.date} title={label} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="sr-only">{label}</span>
              <div className="flex w-full flex-col items-center justify-end" style={{ height: BAR_MAX + 18 }}>
                {d.count > 0 && (
                  <span className={`mb-1 text-[11px] tabular-nums ${today ? "text-accent" : "text-ink-3"}`}>
                    {d.count}
                  </span>
                )}
                <div
                  className={`w-full max-w-8 rounded-md ${
                    d.count === 0
                      ? "bg-line"
                      : today
                        ? "bg-accent"
                        : weekend
                          ? "bg-accent/25"
                          : "bg-accent/50"
                  }`}
                  style={{ height: d.count ? Math.max(6, Math.round((d.count / max) * BAR_MAX)) : 3 }}
                />
              </div>
              <span
                className={`mt-2 text-[11px] leading-tight ${today ? "font-medium text-accent" : "text-ink-3"}`}
                aria-hidden
              >
                {weekday.format(date).replace(".", "")} {date.getUTCDate()}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
