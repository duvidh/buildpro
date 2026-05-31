export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLeadById } from "@/actions/leads";
import { getEmployees } from "@/actions/hr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadEditClient } from "./_components/lead-edit-client";
import type { CreateLeadInput } from "@/lib/schemas/lead-schema";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, rawEmployees, t] = await Promise.all([
    getLeadById(id),
    getEmployees(),
    getTranslations("leads.detail"),
  ]);

  if (!lead) notFound();

  const employees = rawEmployees
    .filter((e) => e.active)
    .map((e) => ({ id: e.id, name: e.name }));

  const defaultValues: Partial<CreateLeadInput> & {
    constructionTypes: string[];
    city: string;
  } = {
    name: lead.name,
    phone: lead.phone,
    phone2: lead.phone2 ?? "",
    email: lead.email ?? "",
    propertyAddress: lead.propertyAddress ?? "",
    city: lead.city ?? "",
    estimatedSize: lead.estimatedSize !== null ? String(lead.estimatedSize) : "",
    constructionTypes: lead.constructionTypes ?? [],
    source: lead.source as CreateLeadInput["source"],
    budget: lead.budget !== null ? String(lead.budget) : "",
    notes: lead.notes ?? "",
    assignedEmployeeId: lead.assignedEmployeeId ?? undefined,
  };

  return (
    <div className="max-w-3xl">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadEditClient
            leadId={lead.id}
            defaultValues={defaultValues}
            employees={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}
