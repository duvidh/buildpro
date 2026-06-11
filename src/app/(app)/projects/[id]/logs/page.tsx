export const dynamic = "force-dynamic";

import { getDailyLogs } from "@/actions/daily-logs";
import { DailyLogsClient, type SerializedLog } from "./_components/daily-logs-client";

export default async function ProjectLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const logs = await getDailyLogs(id);

  const serialized: SerializedLog[] = logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString(),
    weatherConditions: l.weatherConditions,
    workforceCount: l.workforceCount,
    safetyIncidents: l.safetyIncidents,
    notes: l.notes,
    supervisorName: l.supervisor?.name ?? null,
  }));

  return <DailyLogsClient projectId={id} logs={serialized} />;
}
