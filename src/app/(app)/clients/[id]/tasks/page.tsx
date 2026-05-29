export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getClientTasks, getTaskSelectData } from "@/actions/tasks";
import { EntityTasksClient } from "@/components/tasks/entity-tasks-client";

export default async function ClientTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, tasks, selectData] = await Promise.all([
    db.client.findUnique({ where: { id }, select: { id: true, name: true } }),
    getClientTasks(id),
    getTaskSelectData(),
  ]);

  if (!client) notFound();

  const serialized = JSON.parse(JSON.stringify(tasks));

  return (
    <EntityTasksClient
      initial={serialized}
      selectData={selectData}
      entityType="client"
      entityId={id}
      entityName={client.name}
    />
  );
}
