"use client";

import { useTransition } from "react";
import { deleteProject } from "@/lib/actions/projects";
import { TrashIcon } from "./icons";

export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Weet je zeker dat je het project "${name}" wilt verwijderen? De taken blijven bestaan, zonder project.`)) return;
    startTransition(() => deleteProject(id));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink-2 hover:border-bad/40 hover:text-bad disabled:opacity-60"
    >
      <TrashIcon width={15} height={15} />
      Project verwijderen
    </button>
  );
}
