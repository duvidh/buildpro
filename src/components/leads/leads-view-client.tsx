"use client";

import { useState } from "react";
import { List, Kanban } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LeadsTable } from "./leads-table";
import { LeadsPipeline } from "./leads-pipeline";
import { LEAD_STATUS_CONFIG } from "./lead-status-badge";
import type { LeadStatusValue } from "@/lib/constants/lead-enums";

type EmployeeOption = { id: string; name: string };

type Lead = {
  id:                 string;
  name:               string;
  phone:              string;
  phone2:             string | null;
  email:              string | null;
  propertyAddress:    string | null;
  city:               string | null;
  estimatedSize:      number | null;
  constructionTypes:  string[];
  source:             string;
  status:             LeadStatusValue;
  urgency:            string;
  budget:             number | null;
  notes:              string | null;
  convertedToId:      string | null;
  assignedEmployeeId: string | null;
  assignedEmployee:   { id: string; name: string } | null;
  createdAt:          string;
};

type Counts = {
  total:     number;
  new:       number;
  active:    number;
  converted: number;
  lost:      number;
};

type View = "list" | "pipeline";

// ─── View toggle ──────────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const t = useTranslations("leads.view");
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
      <button
        type="button"
        onClick={() => onChange("list")}
        title={t("listTitle")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          view === "list"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <List className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("list")}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("pipeline")}
        title={t("pipelineTitle")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          view === "pipeline"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Kanban className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("pipeline")}</span>
      </button>
    </div>
  );
}

// ─── Main client wrapper ──────────────────────────────────────────────────────

export function LeadsViewClient({
  leads,
  employees,
  counts,
}: {
  leads:     Lead[];
  employees: EmployeeOption[];
  counts:    Counts;
}) {
  const t    = useTranslations("leads.stats");
  const [view, setView] = useState<View>("list");

  const statBadges = [
    { labelKey: "total",     value: counts.total,     className: "bg-slate-100 text-slate-700 border-slate-200" },
    { labelKey: "new",       value: counts.new,       className: LEAD_STATUS_CONFIG.NEW.className },
    { labelKey: "active",    value: counts.active,    className: LEAD_STATUS_CONFIG.CONTACTED.className },
    { labelKey: "converted", value: counts.converted, className: LEAD_STATUS_CONFIG.CONVERTED.className },
  ];

  return (
    <div className="space-y-4">
      {/* ── Top bar: stats + view toggle ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {statBadges.map((s) => (
            <Badge
              key={s.labelKey}
              variant="outline"
              className={cn("gap-1.5 px-3 py-1 text-sm", s.className)}
            >
              <span className="font-bold">{s.value}</span>
              {t(s.labelKey as Parameters<typeof t>[0])}
            </Badge>
          ))}
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* ── Active view ── */}
      {view === "list" ? (
        <LeadsTable leads={leads} employees={employees} />
      ) : (
        <LeadsPipeline
          leads={leads}
          convertedCount={counts.converted}
          lostCount={counts.lost}
        />
      )}
    </div>
  );
}
