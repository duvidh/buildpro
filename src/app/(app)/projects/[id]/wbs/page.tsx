export const dynamic = "force-dynamic";

import { getProjectWorkPackages } from "@/actions/projects";
import { WBSTab } from "@/components/projects/wbs-tab";

export default async function ProjectWBSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectWorkPackages(id);
  const workPackages = JSON.parse(JSON.stringify(raw));
  return <WBSTab projectId={id} workPackages={workPackages} />;
}
