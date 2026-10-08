import { PROJECT_COLORS, type ProjectColor } from "@/lib/project-colors";

export function ProjectDot({ color, size = 8 }: { color: ProjectColor; size?: number }) {
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-full"
      style={{ width: size, height: size, background: PROJECT_COLORS[color] }}
    />
  );
}
