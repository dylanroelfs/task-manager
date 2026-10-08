import { HomeView } from "@/components/home-view";
import { TasksView } from "@/components/tasks-view";

// Home; projecten staan (nog) op /?project=<id>
export default async function Page({ searchParams }: PageProps<"/">) {
  const { project, afgerond } = await searchParams;
  if (typeof project !== "string") return <HomeView />;
  return <TasksView view="open" projectId={project} showDone={afgerond === "1"} />;
}
