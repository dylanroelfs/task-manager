"use client";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 place-items-center px-4 py-16">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold tracking-tight">Data kon niet geladen worden</h1>
        <p className="mt-2 text-sm text-ink-2">
          Controleer of <code className="font-mono text-xs">supabase/migrations</code> in je project
          gedraaid is en of de keys in <code className="font-mono text-xs">.env.local</code> kloppen.
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="mt-3 rounded-lg bg-surface-2 p-3 font-mono text-xs text-ink-2">{error.message}</p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-surface hover:opacity-90"
        >
          Opnieuw proberen
        </button>
      </div>
    </main>
  );
}
