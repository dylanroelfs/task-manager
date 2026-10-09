/**
 * Direct zichtbaar bij elke navigatie binnen het dashboard, terwijl de pagina op de server
 * wordt opgebouwd. Zorgt er ook voor dat Next.js de pagina's in productie vooraf kan laden.
 * De sidebar (layout) blijft gewoon staan.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Laden" className="flex flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line pl-16 pr-4 sm:pr-6 lg:px-8">
        <Block className="h-4 w-40" />
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="flex items-center justify-between gap-3">
          <Block className="h-8 w-48" />
          <Block className="h-9 w-9" />
        </div>
        <Block className="h-11 w-full rounded-xl" />
        <div className="card divide-y divide-line overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Block className="h-5 w-5 rounded-full" />
              <Block className="h-4 flex-1" style={{ maxWidth: `${60 - i * 7}%` }} />
              <Block className="hidden h-5 w-20 sm:block" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Block({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} style={style} />;
}
