"use client";

import { useCurrency } from "@/lib/currency-context";
import { Badge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import type { DashboardData } from "./types";

export function FinanceWidget({ data }: { data: DashboardData }) {
  const { fmtCompact } = useCurrency();
  const { kpis, chartData, totalChartRevenue, avgMonthlyRevenue, currentMonth } = data;
  const revenueChange =
    kpis.prevMonthRevenue > 0
      ? Math.round(((kpis.monthlyRevenue - kpis.prevMonthRevenue) / kpis.prevMonthRevenue) * 100)
      : null;

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Stats row */}
      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-muted-foreground">החודש</p>
          <p className="text-xl font-bold text-emerald-600">{fmtCompact(kpis.monthlyRevenue)}</p>
          {revenueChange !== null && (
            <p className={`text-xs mt-0.5 ${revenueChange >= 0 ? "text-emerald-600" : "text-orange-500"}`}>
              {revenueChange >= 0 ? "+" : ""}{revenueChange}% מחודש קודם
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ממוצע חודשי</p>
          <p className="text-xl font-bold text-foreground">{fmtCompact(avgMonthlyRevenue)}</p>
        </div>
        <div className="ms-auto self-start">
          <Badge variant="outline" className="text-xs font-normal">
            {fmtCompact(kpis.monthlyRevenue)} {currentMonth}
          </Badge>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <RevenueChart data={chartData} currentMonth={currentMonth} />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        סך 6 חודשים: {fmtCompact(totalChartRevenue)}
      </p>
    </div>
  );
}
