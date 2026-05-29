export const dynamic = "force-dynamic";

import { getProjectProcurement } from "@/actions/projects";
import { ProcurementTab } from "@/components/projects/procurement-tab";

export default async function ProjectProcurementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectProcurement(id);
  const contracts = JSON.parse(JSON.stringify(raw));
  return <ProcurementTab projectId={id} contracts={contracts} />;
}
