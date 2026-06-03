import { getTranslations } from "next-intl/server";
import { AlertTriangle, CheckCircle2, Flame, TrendingDown } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/formatters";
import type { ProjectPulse } from "@/actions/finance-analytics";

type Props = {
  pulse: ProjectPulse;
  currencyCode: string;
  locale: string;
};

export async function ProjectPulseWidget({ pulse, currencyCode, locale }: Props) {
  const t = await getTranslations("projects");
  const intlLocale = locale === "he" ? "he-IL" : "en-US";
  const fmt = (n: number) => formatCurrencyCompact(n, currencyCode, intlLocale);

  const statusConfig = {
    GREEN: {
      label: t("pulse.statusOnTrack"),
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      cls:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    AMBER: {
      label: t("pulse.statusAtRisk"),
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      cls:  "bg-amber-100 text-amber-700 border-amber-200",
    },
    RED: {
      label: t("pulse.statusOverBudget"),
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      cls:  "bg-red-100 text-red-700 border-red-200",
    },
  }[pulse.projectedStatus];

  // Cap bar widths at 100% (raw percent is preserved for the label)
  const physWidth = Math.min(pulse.progressPercentage, 100);
  const budgWidth = Math.min(pulse.budgetConsumedPercent, 100);

  const budgBarColor =
    pulse.budgetConsumedPercent > 100 ? "bg-red-500" :
    pulse.budgetConsumedPercent > 80  ? "bg-amber-500" :
    "bg-blue-500";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">
          {t("pulse.financialPulse")}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Weekly burn rate chip */}
          <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1">
            <Flame className="h-3 w-3 text-orange-500 shrink-0" />
            <span className="text-[11px] font-medium text-orange-700 whitespace-nowrap">
              {fmt(pulse.weeklyBurnRate)}{t("pulse.perWeek")}
            </span>
          </div>
          {/* Status badge */}
          <div
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${statusConfig.cls}`}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: t("pulse.budget"),    value: fmt(pulse.totalBudget),   color: "text-foreground"   },
          { label: t("pulse.spent"),     value: fmt(pulse.totalSpent),    color: "text-rose-600"     },
          { label: t("pulse.invoiced"),  value: fmt(pulse.totalInvoiced), color: "text-blue-600"     },
          { label: t("pulse.collected"), value: fmt(pulse.totalPaid),     color: "text-emerald-600"  },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border bg-muted/30 p-2.5">
            <p className="text-[10px] text-muted-foreground leading-tight">{kpi.label}</p>
            <p className={`text-base font-bold mt-0.5 leading-tight ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Dual progress bars ────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Physical progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("pulse.physicalProgress")}</span>
            <span className="font-semibold tabular-nums">{pulse.progressPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${physWidth}%` }}
            />
          </div>
        </div>
        {/* Budget consumed */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("pulse.budgetConsumed")}</span>
            <span
              className={`font-semibold tabular-nums ${pulse.budgetConsumedPercent > 100 ? "text-red-600" : "text-foreground"}`}
            >
              {pulse.budgetConsumedPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${budgBarColor}`}
              style={{ width: `${budgWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
