export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCrmFiles } from "@/actions/files";
import { getLeadById } from "@/actions/leads";
import { getSession } from "@/lib/session";
import { DELETE_ROLES } from "@/lib/auth-utils";
import type { UserRole } from "@/lib/auth-utils";
import { CrmFilesClient } from "@/components/crm/crm-files-client";

export default async function LeadFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, rawFiles, session] = await Promise.all([
    getLeadById(id),
    getCrmFiles({ leadId: id }),
    getSession(),
  ]);

  if (!lead) notFound();

  const userRole = (session?.role ?? "FIELD_WORKER") as UserRole;
  const canDelete = DELETE_ROLES.includes(userRole);

  const files = JSON.parse(JSON.stringify(rawFiles));

  return (
    <CrmFilesClient
      entity={{ type: "lead", id }}
      files={files}
      canDelete={canDelete}
    />
  );
}
