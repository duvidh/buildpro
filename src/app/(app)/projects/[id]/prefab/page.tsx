export const dynamic = "force-dynamic";

import { getPrefabElements } from "@/actions/prefab";
import { getProjectTasks } from "@/actions/projects";
import { PrefabClient } from "../_components/prefab-client";

export default async function ProjectPrefabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [raw, rawTasks] = await Promise.all([
    getPrefabElements(id),
    getProjectTasks(id),
  ]);
  const elements = JSON.parse(JSON.stringify(raw));
  const tasks = JSON.parse(JSON.stringify(rawTasks));
  return <PrefabClient projectId={id} elements={elements} tasks={tasks} />;
}
