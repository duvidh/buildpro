export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCommunications } from "@/actions/communications";
import { getLeadById } from "@/actions/leads";
import { CommsClient } from "@/components/crm/comms-client";

export default async function LeadActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, rawEntries] = await Promise.all([
    getLeadById(id),
    getCommunications({ leadId: id }),
  ]);

  if (!lead) notFound();

  // Serialize dates
  const entries = JSON.parse(JSON.stringify(rawEntries));

  return (
    <div className="py-2">
      <CommsClient
        entity={{ type: "lead", id }}
        initialEntries={entries}
      />
    </div>
  );
}
