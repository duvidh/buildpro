export const dynamic = "force-dynamic";

import { getProjectMilestones, getProjectHeader } from "@/actions/projects";
import { hasRole, FINANCE_WRITE_ROLES } from "@/lib/auth-utils";
import { MilestonesTimeline } from "@/components/projects/milestones-timeline";

export default async function ProjectMilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [raw, project, canCreateInvoice] = await Promise.all([
    getProjectMilestones(id),
    getProjectHeader(id),
    hasRole(FINANCE_WRITE_ROLES),
  ]);
  const milestones = JSON.parse(JSON.stringify(raw));
  return (
    <MilestonesTimeline
      projectId={id}
      milestones={milestones}
      contractValue={project?.contractValue ?? 0}
      canCreateInvoice={canCreateInvoice}
    />
  );
}
