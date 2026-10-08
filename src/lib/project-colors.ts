// Vaste volgorde: nieuwe projecten krijgen de volgende kleur in de rij.
export const PROJECT_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: "#7b6ae0",
  red: "#e34948",
} as const;

export type ProjectColor = keyof typeof PROJECT_COLORS;

export const PROJECT_COLOR_ORDER = Object.keys(PROJECT_COLORS) as ProjectColor[];
