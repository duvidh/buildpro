export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getLeadById } from "@/actions/leads";
import { LeadHeader } from "./_components/lead-header";
import { LeadTabs } from "./_components/lead-tabs";
import type { LeadStatusValue } from "@/lib/constants/lead-enums";

export default async function LeadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const headerLead = {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    status: lead.status as LeadStatusValue,
    source: lead.source,
    convertedToId: lead.convertedToId,
  };

  return (
    /* Break out of the app layout's p-4/p-6 padding */
    <div className="-mt-4 -mx-4 sm:-mt-6 sm:-mx-6 flex flex-col min-h-full">

      {/* ── Sticky command-center header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <LeadHeader lead={headerLead} />
        </div>
        <div className="px-4 sm:px-6">
          <LeadTabs leadId={id} />
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="px-4 sm:px-6 py-6 flex-1">
        {children}
      </div>
    </div>
  );
}
