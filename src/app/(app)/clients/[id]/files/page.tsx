export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getCrmFiles } from "@/actions/files";
import { getClientHeader } from "@/actions/clients";
import { getSession } from "@/lib/session";
import { DELETE_ROLES } from "@/lib/auth-utils";
import type { UserRole } from "@/lib/auth-utils";
import { CrmFilesClient } from "@/components/crm/crm-files-client";

export default async function ClientFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, rawFiles, session] = await Promise.all([
    getClientHeader(id),
    getCrmFiles({ clientId: id }),
    getSession(),
  ]);

  if (!client) notFound();

  if (!session) redirect("/login");
  const userRole = session.role as UserRole;
  const canDelete = DELETE_ROLES.includes(userRole);

  const files = JSON.parse(JSON.stringify(rawFiles));

  return (
    <CrmFilesClient
      entity={{ type: "client", id }}
      files={files}
      canDelete={canDelete}
    />
  );
}
