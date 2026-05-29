export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProjectSettings } from "@/actions/projects";
import { SettingsClient } from "../_components/settings-client";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const settings = await getProjectSettings(id);
  if (!settings) notFound();
  return <SettingsClient projectId={id} initialSettings={settings} />;
}
