export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProjectTeam } from "@/actions/projects";
import { TeamClient } from "../_components/team-client";

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectTeam(id);
  if (!raw) notFound();
  const data = JSON.parse(JSON.stringify(raw));
  return <TeamClient data={data} />;
}
