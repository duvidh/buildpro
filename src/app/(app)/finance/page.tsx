export const dynamic = "force-dynamic";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCompanyFinancials, getGlobalLedger } from "@/actions/finance";
import { getCurrencyCode } from "@/actions/settings";
import { FinanceChart } from "@/components/finance/finance-chart";
import { LedgerClient } from "@/components/finance/ledger-client";
import { formatCurrencyCompact } from "@/lib/formatters";
import { getProjects } from "@/actions/projects";

function ProfitBadge({ margin }: { margin: number }) {
  const isPositive = margin >= 0;
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold tabular-nums ${
        isPositive
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      {isPositive ? "+" : ""}
      {margin.toFixed(1)}%
    </Badge>
  );
}

const STATUS_CLASS: Record<string, string> = {
  PLANNING:  "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  ON_HOLD:   "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

export default async function FinancePage() {
  const [data, ledgerEntries, allProjectsRaw, t, locale, currencyCode] = await Promise.all([
    getCompanyFinancials(),
    getGlobalLedger(),
    getProjects(),
    getTranslations("finance"),
    getLocale(),
    getCurrencyCode(),
  ]);
  const allProjects = allProjectsRaw.map((p) => ({ id: p.id, name: p.name }));

  const intlLocale = locale === "he" ? "he-IL" : "en-US";
  const fmt = (n: number) => formatCurrencyCompact(n, currencyCode, intlLocale);

  const dir = locale === "he" ? "rtl" : "ltr";

  const kpis = [
    {
      labelKey: "kpi.revenue" as const,
      value: fmt(data.totalRevenue),
      sub: t("kpi.projects", { count: data.projectSummaries.filter(p => p.paid > 0).length }),
      icon: Wallet,
      iconBg: "bg-emerald-50", iconColor: "text-emerald-600", valueColor: "text-emerald-700",
    },
    {
      labelKey: "kpi.outstanding" as const,
      value: fmt(data.totalOutstanding),
      sub: t("kpi.projects", { count: data.projectSummaries.filter(p => p.outstanding > 0).length }),
      icon: AlertCircle,
      iconBg: "bg-orange-50", iconColor: "text-orange-500", valueColor: "text-orange-600",
    },
    {
      labelKey: "kpi.cost" as const,
      value: fmt(data.totalCost),
      sub: t("kpi.costSub"),
      icon: TrendingDown,
      iconBg: "bg-red-50", iconColor: "text-red-500", valueColor: "text-red-600",
    },
    {
      labelKey: "kpi.grossProfit" as const,
      value: fmt(data.grossProfit),
      sub: t("kpi.margin", { pct: data.profitMargin.toFixed(1) }),
      icon: data.grossProfit >= 0 ? TrendingUp : TrendingDown,
      iconBg:    data.grossProfit >= 0 ? "bg-blue-50"    : "bg-red-50",
      iconColor: data.grossProfit >= 0 ? "text-blue-600" : "text-red-600",
      valueColor:data.grossProfit >= 0 ? "text-blue-700" : "text-red-700",
    },
  ];

  const hasData = data.monthlyData.some(m => m.revenue > 0 || m.cost > 0);

  const tStatus = (s: string) => {
    try { return t(`projectStatus.${s}` as Parameters<typeof t>[0]); } catch { return s; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.labelKey} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t(kpi.labelKey)}</p>
                  <p className={`mt-1.5 text-2xl font-bold tabular-nums ${kpi.valueColor}`}>
                    {kpi.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-tab view */}
      <Tabs defaultValue="dashboard" dir={dir}>
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            {t("tabs.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            {t("tabs.ledger")}
          </TabsTrigger>
        </TabsList>

        {/* ─── Dashboard Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6 mt-0">

          {/* Monthly Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    {t("chart.title")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("chart.subtitle")}
                  </p>
                </div>
                {data.profitMargin !== 0 && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      data.grossProfit >= 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {t("chart.overallMargin", { pct: data.profitMargin.toFixed(1) })}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {hasData ? (
                <FinanceChart data={data.monthlyData} />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                  {t("chart.empty")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects P&L Table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t("projectPL.title")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {data.projectSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-8 text-center">{t("projectPL.empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-start px-5 py-2.5 font-medium text-muted-foreground text-xs">{t("projectPL.colProject")}</th>
                        <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">{t("projectPL.colContract")}</th>
                        <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">{t("projectPL.colCost")}</th>
                        <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">{t("projectPL.colGrossProfit")}</th>
                        <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">{t("projectPL.colOutstanding")}</th>
                        <th className="text-end px-5 py-2.5 font-medium text-muted-foreground text-xs">{t("projectPL.colMargin")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.projectSummaries.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{p.name}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-4 px-1.5 py-0 ${STATUS_CLASS[p.status] ?? ""}`}
                              >
                                {tStatus(p.status)}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                            {p.contractValue > 0 ? fmt(p.contractValue) : "—"}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {p.cost > 0 ? fmt(p.cost) : "—"}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {p.contractValue > 0 ? (
                              <span className={p.profit >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                                {p.profit >= 0 ? "+" : ""}
                                {fmt(p.profit)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums">
                            {p.outstanding > 0
                              ? <span className="text-orange-600">{fmt(p.outstanding)}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-5 py-3 text-end">
                            {p.contractValue > 0 ? <ProfitBadge margin={p.margin} /> : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Ledger Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="ledger" className="mt-0">
          <div className="mb-4">
            <h2 className="text-base font-semibold">{t("ledger.title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("ledger.subtitle")}</p>
          </div>
          <LedgerClient entries={ledgerEntries} projects={allProjects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
