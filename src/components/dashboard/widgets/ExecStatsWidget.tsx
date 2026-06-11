"use client";

import Link from "next/link";
import { FolderKanban, BadgeCheck, Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/currency-context";
import type { DashboardData } from "./types";

/**
 * Executive command-center stats: active projects, approved quote revenue,
 * and the pending quote pipeline.
 */
export function ExecStatsWidget({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard.execStats");
  const { fmtCompact } = useCurrency();
  const { activeProjectsCount, financials } = data.execStats;

  const cards = [
    {
      href:       "/projects",
      label:      t("activeProjects"),
      value:      String(activeProjectsCount),
      sub:        t("activeProjectsSub"),
      icon:       FolderKanban,
      gradient:   "from-violet-500/10 to-purple-500/10",
      iconBg:     "bg-violet-500/15",
      iconColor:  "text-violet-600 dark:text-violet-400",
      valueColor: "text-violet-700 dark:text-violet-300",
    },
    {
      href:       "/quotes",
      label:      t("approvedRevenue"),
      value:      fmtCompact(financials.approvedTotal),
      sub:        t("quoteCount", { count: financials.approvedCount }),
      icon:       BadgeCheck,
      gradient:   "from-emerald-500/10 to-teal-500/10",
      iconBg:     "bg-emerald-500/15",
      iconColor:  "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-700 dark:text-emerald-300",
    },
    {
      href:       "/quotes",
      label:      t("pendingQuotes"),
      value:      fmtCompact(financials.pendingTotal),
      sub:        t("quoteCount", { count: financials.pendingCount }),
      icon:       Hourglass,
      gradient:   "from-amber-500/10 to-orange-500/10",
      iconBg:     "bg-amber-500/15",
      iconColor:  "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div className="grid h-full grid-cols-1 gap-3 p-3 sm:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className={`flex items-start justify-between rounded-xl border border-border/40
            bg-gradient-to-br ${card.gradient} p-3
            transition-all duration-200 hover:border-border hover:shadow-sm`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold leading-none tracking-tight ${card.valueColor}`}>
              {card.value}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{card.sub}</p>
          </div>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </div>
        </Link>
      ))}
    </div>
  );
}
