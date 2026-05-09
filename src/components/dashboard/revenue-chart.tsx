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

const data = [
  { month: "דצמ׳", revenue: 210000 },
  { month: "ינו׳", revenue: 185000 },
  { month: "פבר׳", revenue: 245000 },
  { month: "מרץ", revenue: 230000 },
  { month: "אפר׳", revenue: 285000 },
  { month: "מאי", revenue: 320000 },
];

const CURRENT_MONTH = "מאי";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      <p className="text-primary font-bold">
        ₪{(payload[0].value / 1000).toFixed(0)}K
      </p>
    </div>
  );
}

export function RevenueChart() {
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
          tickFormatter={(v) => `₪${v / 1000}K`}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={52}>
          {data.map((entry) => (
            <Cell
              key={entry.month}
              fill={
                entry.month === CURRENT_MONTH
                  ? "var(--color-primary)"
                  : "var(--color-primary)"
              }
              opacity={entry.month === CURRENT_MONTH ? 1 : 0.55}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
