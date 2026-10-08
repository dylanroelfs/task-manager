import { TasksView } from "@/components/tasks-view";

export default async function Page({ searchParams }: PageProps<"/">) {
  const { project } = await searchParams;
  return <TasksView view="open" projectId={typeof project === "string" ? project : undefined} />;
}
