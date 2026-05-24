export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Users } from "lucide-react";
import { getLeads } from "@/actions/leads";
import { getEmployees } from "@/actions/hr";
import { LeadsTable } from "@/components/leads/leads-table";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import {
  LEAD_STATUS_CONFIG,
} from "@/components/leads/lead-status-badge";
import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@/generated/prisma/client";

type EmployeeOption = { id: string; name: string };

async function LeadsContent({ employees }: { employees: EmployeeOption[] }) {
  const leads = await getLeads();

  const counts = {
    total: leads.length,
    new: leads.filter((l) => l.status === LeadStatus.NEW).length,
    active: leads.filter(
      (l) => l.status !== LeadStatus.CONVERTED && l.status !== LeadStatus.LOST
    ).length,
    converted: leads.filter((l) => l.status === LeadStatus.CONVERTED).length,
  };

  const serializedLeads = leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    phone2: l.phone2,
    email: l.email,
    propertyAddress: l.propertyAddress,
    source: l.source,
    status: l.status,
    urgency: l.urgency,
    budget: l.budget,
    notes: l.notes,
    convertedToId: l.convertedToId,
    assignedEmployeeId: l.assignedEmployeeId,
    assignedEmployee: l.assignedEmployee,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: `סה"כ לידים`, value: counts.total, className: "bg-slate-100 text-slate-700 border-slate-200" },
          { label: "חדשים", value: counts.new, className: LEAD_STATUS_CONFIG.NEW.className },
          { label: "פעילים", value: counts.active, className: LEAD_STATUS_CONFIG.CONTACTED.className },
          { label: "הומרו", value: counts.converted, className: LEAD_STATUS_CONFIG.CONVERTED.className },
        ].map((s) => (
          <Badge key={s.label} variant="outline" className={`gap-1.5 px-3 py-1 text-sm ${s.className}`}>
            <span className="font-bold">{s.value}</span>
            {s.label}
          </Badge>
        ))}
      </div>
      <LeadsTable leads={serializedLeads} employees={employees} />
    </>
  );
}

export default async function LeadsPage() {
  const rawEmployees = await getEmployees();
  const employees: EmployeeOption[] = rawEmployees
    .filter((e) => e.active)
    .map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground leading-none">
              ניהול לידים
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              ניהול מחזור המכירות ולקוחות פוטנציאליים
            </p>
          </div>
        </div>
        <NewLeadDialog employees={employees} />
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <LeadsContent employees={employees} />
      </Suspense>
    </div>
  );
}
