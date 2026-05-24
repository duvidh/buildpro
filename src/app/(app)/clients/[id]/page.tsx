export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  TrendingUp,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getClientById } from "@/actions/clients";
import { ClientTabs } from "@/components/clients/client-tabs";
import { fmtShekel } from "@/lib/utils";

function getInitials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("");
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  // ── Financial summary ──────────────────────────────────────────────────────
  const totalContractValue = client.projects.reduce(
    (s, p) => s + p.contractValue, 0
  );
  const totalInvoiced = client.invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = client.invoices.reduce((s, i) => s + i.paidAmount, 0);
  const openBalance = totalInvoiced - totalPaid;

  const financialKpis = [
    {
      label: "ערך חוזים",
      value: fmtShekel(totalContractValue),
      icon: TrendingUp,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      label: "סה\"כ חויב",
      value: fmtShekel(totalInvoiced),
      icon: FileText,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      valueColor: "text-violet-600",
    },
    {
      label: "סה\"כ שולם",
      value: fmtShekel(totalPaid),
      icon: Wallet,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label: "יתרת חוב",
      value: fmtShekel(openBalance),
      icon: AlertCircle,
      iconBg: openBalance > 0 ? "bg-orange-50" : "bg-emerald-50",
      iconColor: openBalance > 0 ? "text-orange-500" : "text-emerald-600",
      valueColor: openBalance > 0 ? "text-orange-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground -me-1">
          <Link href="/clients">
            <ArrowRight className="h-4 w-4 me-1" />
            לקוחות
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium text-foreground">{client.name}</span>
      </div>

      {/* Client header */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {getInitials(client.name)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground leading-none">
                    {client.name}
                  </h1>
                  {client.contactName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      איש קשר: {client.contactName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {client.projects.length} פרויקטים
                  </Badge>
                  {client.companyNumber && (
                    <Badge variant="outline" className="text-xs font-mono" dir="ltr">
                      ח.פ {client.companyNumber}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator className="my-3" />

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                    dir="ltr"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {client.phone}
                  </a>
                )}
                {client.phone2 && (
                  <a
                    href={`tel:${client.phone2}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    dir="ltr"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {client.phone2}
                  </a>
                )}
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                    dir="ltr"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {client.email}
                  </a>
                )}
                {client.address && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {client.address}
                  </span>
                )}
              </div>

              {client.notes && (
                <p className="mt-3 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  {client.notes}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {financialKpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`mt-1 text-xl font-bold ${kpi.valueColor}`}>
                    {kpi.value}
                  </p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.iconBg} shrink-0`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card className="shadow-sm">
        <CardContent className="p-0 pb-4">
          <ClientTabs
            clientId={client.id}
            projects={client.projects}
            quotes={client.quotes}
            invoices={client.invoices}
          />
        </CardContent>
      </Card>
    </div>
  );
}
