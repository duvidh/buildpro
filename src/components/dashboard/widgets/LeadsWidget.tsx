"use client";

import Link from "next/link";
import { TrendingUp, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LEAD_STATUS_CONFIG } from "@/components/leads/lead-status-badge";
import type { DashboardData } from "./types";

type StatusEntry = { status: string; count: number; bar: string };

export function LeadsWidget({ data }: { data: DashboardData }) {
  const t    = useTranslations("leads");
  const { kpis } = data;

  const pipelineStatuses: StatusEntry[] = [
    { status: "NEW",               count: kpis.newLeads,                                  bar: "bg-slate-400" },
    { status: "CONTACTED",         count: Math.max(0, Math.round(kpis.activeLeads * 0.3)), bar: "bg-blue-400" },
    { status: "MEETING_SCHEDULED", count: Math.max(0, Math.round(kpis.activeLeads * 0.2)), bar: "bg-indigo-400" },
    { status: "QUOTE_SENT",        count: Math.max(0, Math.round(kpis.activeLeads * 0.1)), bar: "bg-violet-400" },
    { status: "NEGOTIATION",       count: Math.max(0, Math.round(kpis.activeLeads * 0.05)), bar: "bg-orange-400" },
  ];

  const maxCount = Math.max(...pipelineStatuses.map((s) => s.count), 1);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Top stat */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-blue-600">{kpis.activeLeads}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("widget.activeInPipeline")}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
          <TrendingUp className="h-6 w-6 text-blue-500" />
        </div>
      </div>

      {/* Pipeline funnel bars */}
      <div className="flex-1 space-y-2">
        {pipelineStatuses.map((s) => {
          const cfg   = LEAD_STATUS_CONFIG[s.status as keyof typeof LEAD_STATUS_CONFIG];
          const label = (() => {
            try { return t(`status.${s.status}` as Parameters<typeof t>[0]); }
            catch { return s.status; }
          })();
          return (
            <div key={s.status} className="flex items-center gap-2">
              <span className={`text-xs w-24 truncate text-end shrink-0 ${cfg?.className ?? ""}`}>
                {label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.bar} transition-all`}
                  style={{ width: `${(s.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-5 text-start shrink-0">
                {s.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <Button variant="ghost" size="sm" asChild className="self-end text-xs text-muted-foreground -mb-1">
        <Link href="/leads">
          {t("widget.allLeads")} <ChevronLeft className="h-3.5 w-3.5 ms-1" />
        </Link>
      </Button>
    </div>
  );
}
