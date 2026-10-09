/**
 * Het witte paneel naast de sidebar waarin elke pagina staat. Vanaf lg zweeft het met wat
 * ruimte eromheen en scrollt het zelf, zodat de topbar bovenin het paneel blijft plakken.
 */
export function AppPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
      <div className="flex min-w-0 flex-1 flex-col bg-canvas lg:h-[calc(100vh-1rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-line lg:shadow-card lg:[scrollbar-gutter:stable]">
        {children}
      </div>
    </div>
  );
}
