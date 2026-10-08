// Vaste volgorde: het 1e project is blauw, het 2e rood, het 3e groen, enz. Eerst de kleuren die het
// meest van elkaar verschillen, zodat een paar projecten (ook in de grafiek) direct te onderscheiden zijn.
export const PROJECT_COLORS = {
  blue: "#2563eb",
  red: "#dc2626",
  green: "#16a34a",
  orange: "#f97316",
  violet: "#9333ea",
  yellow: "#eab308",
  aqua: "#06b6d4",
  magenta: "#db2777",
} as const;

export type ProjectColor = keyof typeof PROJECT_COLORS;

export const PROJECT_COLOR_ORDER = Object.keys(PROJECT_COLORS) as ProjectColor[];
