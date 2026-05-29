"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useCurrency } from "@/lib/currency-context";

type ChartPoint = { month: string; revenue: number };

function CustomTooltip({
  active,
  payload,
  label,
  fmtCompact,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  fmtCompact: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      <p className="text-primary font-bold">{fmtCompact(payload[0].value)}</p>
    </div>
  );
}

export function RevenueChart({
  data,
  currentMonth,
}: {
  data: ChartPoint[];
  currentMonth: string;
}) {
  const { fmtCompact } = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--color-border)"
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(v) => fmtCompact(v)}
          width={56}
        />
        <Tooltip
          content={<CustomTooltip fmtCompact={fmtCompact} />}
          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
        />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={52}>
          {data.map((entry) => (
            <Cell
              key={entry.month}
              fill="var(--color-primary)"
              opacity={entry.month === currentMonth ? 1 : 0.55}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
