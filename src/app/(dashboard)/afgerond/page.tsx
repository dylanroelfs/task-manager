import { TasksView } from "@/components/tasks-view";

export default async function Page({ searchParams }: PageProps<"/afgerond">) {
  const { project } = await searchParams;
  return <TasksView view="done" projectId={typeof project === "string" ? project : undefined} />;
}
