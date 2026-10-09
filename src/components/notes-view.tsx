import { getNotes } from "@/lib/notes";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getProjects } from "@/lib/tasks";
import { NotesList } from "./notes-list";
import { SetupNotice } from "./tasks-view";
import { Topbar } from "./topbar";

/** projectId: filter dat aan staat bij openen (bijv. vanaf een projectpagina). */
export async function NotesView({ projectId }: { projectId?: string }) {
  if (!getSupabaseEnv()) return <SetupNotice />;

  const [projects, notes] = await Promise.all([getProjects(), getNotes()]);

  return (
    <>
      <Topbar
        title="Notities"
        tags={
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium tabular-nums text-ink-2">
            {notes.length}
          </span>
        }
      />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {/* Nieuwe key bij een ander ?project=, zodat het filter de URL volgt (ook via de sidebar) */}
        <NotesList key={projectId ?? ""} notes={notes} projects={projects} initialProjectId={projectId} />
      </main>
    </>
  );
}
