export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLeadTasks, getTaskSelectData } from "@/actions/tasks";
import { EntityTasksClient } from "@/components/tasks/entity-tasks-client";

export default async function LeadTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, tasks, selectData] = await Promise.all([
    db.lead.findUnique({ where: { id }, select: { id: true, name: true } }),
    getLeadTasks(id),
    getTaskSelectData(),
  ]);

  if (!lead) notFound();

  const serialized = JSON.parse(JSON.stringify(tasks));

  return (
    <EntityTasksClient
      initial={serialized}
      selectData={selectData}
      entityType="lead"
      entityId={id}
      entityName={lead.name}
    />
  );
}
