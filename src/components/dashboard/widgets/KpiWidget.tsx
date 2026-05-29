"use client";

import { useCurrency } from "@/lib/currency-context";
import {
  TrendingUp, FolderKanban, CheckSquare, Wallet,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DashboardData } from "./types";

export function KpiWidget({ data }: { data: DashboardData }) {
  const { fmtCompact } = useCurrency();
  const t      = useTranslations("dashboard.kpi");
  const { kpis } = data;

  const revenueChange =
    kpis.prevMonthRevenue > 0
      ? Math.round(((kpis.monthlyRevenue - kpis.prevMonthRevenue) / kpis.prevMonthRevenue) * 100)
      : null;

  const revenueChangeFmt =
    revenueChange !== null
      ? `${revenueChange >= 0 ? "+" : ""}${revenueChange}`
      : null;

  const cards = [
    {
      label:      t("activeLeads"),
      value:      String(kpis.activeLeads),
      sub:        t("newLeads", { count: kpis.newLeads }),
      positive:   kpis.newLeads > 0,
      icon:       TrendingUp,
      iconBg:     "bg-blue-50",
      iconColor:  "text-blue-500",
      valueColor: "text-blue-600",
    },
    {
      label:      t("activeProjects"),
      value:      String(kpis.activeProjects),
      sub:        t("atRisk", { count: kpis.atRiskProjects }),
      positive:   kpis.atRiskProjects === 0,
      icon:       FolderKanban,
      iconBg:     "bg-violet-50",
      iconColor:  "text-violet-500",
      valueColor: "text-violet-600",
    },
    {
      label:      t("openTasks"),
      value:      String(kpis.openTasks),
      sub:        t("overdue", { count: kpis.overdueTasks }),
      positive:   kpis.overdueTasks === 0,
      icon:       CheckSquare,
      iconBg:     "bg-orange-50",
      iconColor:  "text-orange-500",
      valueColor: "text-orange-500",
    },
    {
      label:      t("monthlyRevenue"),
      value:      fmtCompact(kpis.monthlyRevenue),
      sub:        revenueChangeFmt !== null
                    ? t("revenueVsPrev", { change: revenueChangeFmt })
                    : t("revenueFirst"),
      positive:   revenueChange === null ? kpis.monthlyRevenue > 0 : revenueChange >= 0,
      icon:       Wallet,
      iconBg:     "bg-emerald-50",
      iconColor:  "text-emerald-500",
      valueColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-3 h-full xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-start justify-between rounded-xl bg-muted/30 p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold leading-none ${card.valueColor}`}>
              {card.value}
            </p>
            <div className="mt-1.5 flex items-center gap-0.5 text-[11px]">
              {card.positive ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500 shrink-0" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-orange-500 shrink-0" />
              )}
              <span className={card.positive ? "text-emerald-600" : "text-orange-500"}>
                {card.sub}
              </span>
            </div>
          </div>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
