export const dynamic = "force-dynamic";

import { getProjectRisks } from "@/actions/projects";
import { RisksTab } from "@/components/projects/risks-tab";

export default async function ProjectRisksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectRisks(id);
  const risks = JSON.parse(JSON.stringify(raw));
  return <RisksTab projectId={id} risks={risks} />;
}
