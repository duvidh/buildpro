export const dynamic = "force-dynamic";

import { getProjectCR } from "@/actions/projects";
import { CRTab } from "@/components/projects/cr-tab";

export default async function ProjectCRPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectCR(id);
  const changeRequests = JSON.parse(JSON.stringify(raw));
  return <CRTab projectId={id} changeRequests={changeRequests} />;
}
