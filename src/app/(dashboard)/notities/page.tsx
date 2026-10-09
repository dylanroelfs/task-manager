import { NotesView } from "@/components/notes-view";

export default async function Page({ searchParams }: PageProps<"/notities">) {
  const { project } = await searchParams;
  return <NotesView projectId={typeof project === "string" ? project : undefined} />;
}
