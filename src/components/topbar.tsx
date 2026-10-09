"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

/** tags: optioneel naast de titel, bijv. het aantal taken. */
export function Topbar({ title, tags }: { title: string; tags?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/75 pl-16 pr-4 backdrop-blur-xl backdrop-saturate-150 sm:pr-6 lg:px-8">
      {/* Kruimelpad: app / pagina */}
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden text-ink-3 sm:inline">Task Manager</span>
        <span aria-hidden className="hidden text-ink-3/50 sm:inline">
          /
        </span>
        <span className="truncate font-medium text-ink">{title}</span>
      </p>
      {tags && <div className="flex shrink-0 items-center gap-1.5">{tags}</div>}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === "dark",
    () => null,
  );

  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label={dark ? "Licht thema" : "Donker thema"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
