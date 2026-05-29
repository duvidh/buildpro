export const dynamic = "force-dynamic";

import { getProjectGanttData } from "@/actions/tasks";
import { GanttClient } from "../_components/gantt-client";

export default async function ProjectGanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectGanttData(id);
  const tasks = JSON.parse(JSON.stringify(raw));
  return <GanttClient tasks={tasks} />;
}
