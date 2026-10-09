"use client";

import { CloseIcon, SearchIcon } from "./icons";

/** Kleine letters, zonder accenten, zodat "creeren" ook "creëren" vindt. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Zoekterm → losse woorden; een resultaat moet elk woord bevatten. */
export function searchWords(query: string) {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** Ronde zoekbalk met vergrootglas en wisknop. Esc wist ook. */
export function SearchInput({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-ink-3">
        <SearchIcon width={17} height={17} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
        placeholder={label}
        aria-label={label}
        className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-10 shadow-card text-sm outline-none placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Zoekopdracht wissen"
          className="absolute inset-y-0 right-2 my-auto grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <CloseIcon width={15} height={15} />
        </button>
      )}
    </label>
  );
}

/** "3 resultaten gevonden", voor schermlezers ook live aangekondigd. */
export function ResultCount({ count }: { count: number }) {
  return (
    <p className="px-1 text-xs text-ink-3" aria-live="polite">
      {count} {count === 1 ? "resultaat" : "resultaten"} gevonden
    </p>
  );
}
