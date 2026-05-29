export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCommunications } from "@/actions/communications";
import { getClientHeader } from "@/actions/clients";
import { CommsClient } from "@/components/crm/comms-client";

export default async function ClientActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, rawEntries] = await Promise.all([
    getClientHeader(id),
    getCommunications({ clientId: id }),
  ]);

  if (!client) notFound();

  const entries = JSON.parse(JSON.stringify(rawEntries));

  return (
    <div className="py-2">
      <CommsClient
        entity={{ type: "client", id }}
        initialEntries={entries}
      />
    </div>
  );
}
