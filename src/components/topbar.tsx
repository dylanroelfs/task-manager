"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-page/80 pl-16 pr-4 backdrop-blur-md sm:pr-6 lg:px-8">
      <p className="text-sm font-medium text-ink-2">{title}</p>
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
      className="grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"
      aria-label={dark ? "Licht thema" : "Donker thema"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
