"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type MonthData = { month: string; revenue: number; cost: number };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-md text-sm space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium" style={{ color: p.color }}>
            ₪{(p.value / 1000).toFixed(0)}K
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="border-t border-border pt-1 mt-1">
          <span className="text-xs text-muted-foreground">רווח: </span>
          <span
            className={`text-xs font-bold ${
              payload[0].value - payload[1].value >= 0
                ? "text-emerald-600"
                : "text-red-600"
            }`}
          >
            ₪{((payload[0].value - payload[1].value) / 1000).toFixed(0)}K
          </span>
        </div>
      )}
    </div>
  );
}

export function FinanceChart({ data }: { data: MonthData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(v) => `₪${v / 1000}K`}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} />
        <Legend
          formatter={(value) =>
            value === "revenue" ? "הכנסות" : "הוצאות"
          }
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />
        <Bar dataKey="revenue" name="revenue" fill="var(--color-primary)" opacity={0.85} radius={[5, 5, 0, 0]} maxBarSize={40} />
        <Line
          dataKey="cost"
          name="cost"
          type="monotone"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#f97316" }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
