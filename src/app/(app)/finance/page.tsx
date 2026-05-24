export const dynamic = "force-dynamic";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCompanyFinancials } from "@/actions/finance";
import { FinanceChart } from "@/components/finance/finance-chart";
import { fmtShekel } from "@/lib/utils";

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  PLANNING:  { label: "תכנון",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  ACTIVE:    { label: "פעיל",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ON_HOLD:   { label: "מושהה",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
  COMPLETED: { label: "הושלם",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "בוטל",   cls: "bg-red-100 text-red-600 border-red-200" },
};

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

export default async function FinancePage() {
  const data = await getCompanyFinancials();

  const kpis = [
    {
      label: "הכנסות גבויות",
      value: fmtShekel(data.totalRevenue),
      sub: `${data.projectSummaries.filter(p => p.paid > 0).length} פרויקטים`,
      icon: Wallet,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
    },
    {
      label: "חייבים (פתוח)",
      value: fmtShekel(data.totalOutstanding),
      sub: `${data.projectSummaries.filter(p => p.outstanding > 0).length} פרויקטים`,
      icon: AlertCircle,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      valueColor: "text-orange-600",
    },
    {
      label: "עלויות בפועל",
      value: fmtShekel(data.totalCost),
      sub: "עבודה + חומרים + קבלנים",
      icon: TrendingDown,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: "text-red-600",
    },
    {
      label: "רווח גולמי",
      value: fmtShekel(data.grossProfit),
      sub: `מרווח ${data.profitMargin.toFixed(1)}%`,
      icon: data.grossProfit >= 0 ? TrendingUp : TrendingDown,
      iconBg: data.grossProfit >= 0 ? "bg-blue-50" : "bg-red-50",
      iconColor: data.grossProfit >= 0 ? "text-blue-600" : "text-red-600",
      valueColor: data.grossProfit >= 0 ? "text-blue-700" : "text-red-700",
    },
  ];

  const hasData = data.monthlyData.some(m => m.revenue > 0 || m.cost > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">דאשבורד פיננסי</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          ריכוז הכנסות, עלויות ורווחיות כלל הפרויקטים
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
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

      {/* Monthly Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                הכנסות מול הוצאות — 12 חודשים
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                עמודות = הכנסות גבויות · קו = הוצאות בפועל
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
                מרווח כולל {data.profitMargin.toFixed(1)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {hasData ? (
            <FinanceChart data={data.monthlyData} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              אין נתוני הכנסות/הוצאות עדיין — יוצגו כאשר יוזנו חשבוניות ודיווחי שטח
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects P&L Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">רווח/הפסד לפי פרויקט</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {data.projectSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-8 text-center">
              אין פרויקטים עדיין
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-start px-5 py-2.5 font-medium text-muted-foreground text-xs">פרויקט</th>
                    <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">ערך חוזה</th>
                    <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">עלות בפועל</th>
                    <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">רווח גולמי</th>
                    <th className="text-end px-4 py-2.5 font-medium text-muted-foreground text-xs">חייבים</th>
                    <th className="text-end px-5 py-2.5 font-medium text-muted-foreground text-xs">מרווח</th>
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
                            className={`text-[10px] h-4 px-1.5 py-0 ${PROJECT_STATUS[p.status]?.cls ?? ""}`}
                          >
                            {PROJECT_STATUS[p.status]?.label ?? p.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                        {p.contractValue > 0 ? fmtShekel(p.contractValue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {p.cost > 0 ? fmtShekel(p.cost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {p.contractValue > 0 ? (
                          <span className={p.profit >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                            {p.profit >= 0 ? "+" : ""}
                            {fmtShekel(p.profit)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {p.outstanding > 0 ? (
                          <span className="text-orange-600">{fmtShekel(p.outstanding)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
    </div>
  );
}
