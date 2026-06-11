"use client";

import {
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/currency-context";
import type { DashboardData } from "./widgets/types";

// Status → chart color (Tailwind palette values; CSS vars don't reach SVG fills reliably)
const STATUS_COLORS: Record<string, string> = {
  PLANNING:  "#f59e0b", // amber-500
  ACTIVE:    "#3b82f6", // blue-500
  ON_HOLD:   "#6b7280", // gray-500
  COMPLETED: "#10b981", // emerald-500
  CANCELLED: "#ef4444", // red-500
};

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  label?: string;
  format: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-0.5 font-medium text-foreground">{label ?? payload[0]?.name}</p>
      <p className="font-bold text-primary">{format(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

/**
 * Executive dashboard charts: project status distribution (pie) and
 * approved-quote revenue by month (bars). Rendered inside the "charts"
 * dashboard widget.
 */
export function DashboardCharts({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard.charts");
  const tStatus = useTranslations("projects.status");
  const { fmtCompact } = useCurrency();

  const statusData = data.execStats.projectStatusData.map((d) => ({
    name: tStatus(d.status as Parameters<typeof tStatus>[0]),
    value: d.count,
    fill: STATUS_COLORS[d.status] ?? "#6b7280",
  }));
  const revenueData = data.execStats.revenueData;
  const hasRevenue = revenueData.some((m) => m.total > 0);

  return (
    <div className="grid h-full grid-cols-1 gap-3 p-3 md:grid-cols-2">
      {/* ── Pie: project status distribution ── */}
      <div className="flex min-h-[180px] flex-col">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">
          {t("projectStatusTitle")}
        </p>
        {statusData.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/70">
            {t("empty")}
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip format={(n) => String(n)} />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Bars: approved quotes by month ── */}
      <div className="flex min-h-[180px] flex-col">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">
          {t("approvedQuotesTitle")}
        </p>
        {!hasRevenue ? (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/70">
            {t("empty")}
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v) => fmtCompact(v)}
                  width={52}
                />
                <Tooltip
                  content={<ChartTooltip format={fmtCompact} />}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                />
                <Bar
                  dataKey="total"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
