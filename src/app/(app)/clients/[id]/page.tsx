export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TrendingUp, FileText, Wallet, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getClientHeader, getClientOverview } from "@/actions/clients";
import { getCurrencyCode } from "@/actions/settings";
import { formatCurrencyCompact } from "@/lib/formatters";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, financials, t, currencyCode] = await Promise.all([
    getClientHeader(id),
    getClientOverview(id),
    getTranslations("clients.overview"),
    getCurrencyCode(),
  ]);
  if (!client || !financials) notFound();

  const fmt = (n: number) => formatCurrencyCompact(n, currencyCode);

  const openBalance = financials.openBalance;

  const kpis = [
    {
      label:      t("contractValue"),
      value:      fmt(financials.totalContractValue),
      icon:       TrendingUp,
      iconBg:     "bg-blue-50",
      iconColor:  "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      label:      t("totalBilled"),
      value:      fmt(financials.totalInvoiced),
      icon:       FileText,
      iconBg:     "bg-violet-50",
      iconColor:  "text-violet-600",
      valueColor: "text-violet-600",
    },
    {
      label:      t("totalPaid"),
      value:      fmt(financials.totalPaid),
      icon:       Wallet,
      iconBg:     "bg-emerald-50",
      iconColor:  "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label:      t("openBalance"),
      value:      fmt(openBalance),
      icon:       AlertCircle,
      iconBg:     openBalance > 0 ? "bg-orange-50"   : "bg-emerald-50",
      iconColor:  openBalance > 0 ? "text-orange-500" : "text-emerald-600",
      valueColor: openBalance > 0 ? "text-orange-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Financial KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`mt-1 text-xl font-bold ${kpi.valueColor}`}>
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.iconBg} shrink-0`}
                >
                  <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes */}
      {client.notes && (
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">{t("notes")}</p>
            <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">
              {client.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
