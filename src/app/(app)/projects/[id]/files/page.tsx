export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProjectFiles } from "@/actions/files";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/lib/auth-utils";
import { DELETE_ROLES } from "@/lib/auth-utils";
import { FilesClient } from "../_components/files-client";

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [raw, session] = await Promise.all([
    getProjectFiles(id),
    getSession(),
  ]);
  if (!raw) notFound();

  const userRole  = (session?.role ?? "FIELD_WORKER") as UserRole;
  const canDelete = DELETE_ROLES.includes(userRole);

  const files = JSON.parse(JSON.stringify(raw));
  return <FilesClient projectId={id} files={files} canDelete={canDelete} />;
}
