export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProjectQC } from "@/actions/projects";
import { QCTab } from "@/components/projects/qc-tab";

export default async function ProjectQCPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectQC(id);
  if (!raw) notFound();
  const data = JSON.parse(JSON.stringify(raw));
  return <QCTab projectId={id} qualityChecks={data.qualityChecks} ncrs={data.ncrs} />;
}
