export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProjectTasks } from "@/actions/projects";
import { TasksKanban } from "@/components/projects/tasks-kanban";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawTasks = await getProjectTasks(id);
  if (!rawTasks) notFound();
  // Serialize Date objects before passing to client component
  const tasks = JSON.parse(JSON.stringify(rawTasks));
  return <TasksKanban projectId={id} tasks={tasks} />;
}
