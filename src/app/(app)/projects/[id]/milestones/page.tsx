export const dynamic = "force-dynamic";

import { getProjectMilestones } from "@/actions/projects";
import { MilestonesTimeline } from "@/components/projects/milestones-timeline";

export default async function ProjectMilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectMilestones(id);
  const milestones = JSON.parse(JSON.stringify(raw));
  return <MilestonesTimeline projectId={id} milestones={milestones} />;
}
