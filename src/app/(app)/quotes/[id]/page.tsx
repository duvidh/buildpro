export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getQuoteById } from "@/actions/quotes";
import { getClients } from "@/actions/clients";
import { getCatalogItems } from "@/actions/catalog";
import { QuoteHeaderForm } from "@/components/quotes/quote-header-form";
import { QuoteCalculator } from "@/components/quotes/quote-calculator";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "טיוטה",
  SENT: "נשלחה",
  ACCEPTED: "אושרה",
  REJECTED: "נדחתה",
  EXPIRED: "פגת תוקף",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "outline",
  ACCEPTED: "default",
  REJECTED: "destructive",
  EXPIRED: "secondary",
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [quote, clients, catalogItems] = await Promise.all([
    getQuoteById(id),
    getClients(),
    getCatalogItems(),
  ]);

  if (!quote) notFound();

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const catalogOptions = catalogItems.map((c) => ({
    id: c.id,
    name: c.name,
    unit: c.unit,
    unitCost: c.unitCost,
    category: c.category,
  }));

  const entityName = quote.client?.name ?? quote.lead?.name ?? "ללא שיוך";
  const isLeadQuote = !quote.client && !!quote.lead;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground -me-1">
          <Link href="/quotes">
            <ArrowRight className="h-4 w-4 me-1" />
            הצעות מחיר
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium text-foreground">
          {quote.quoteNumber ?? "הצעה חדשה"}
        </span>
      </div>

      {/* Page title + badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {quote.quoteNumber ?? "הצעת מחיר"}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isLeadQuote && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                  ליד
                </Badge>
              )}
              <p className="text-sm text-muted-foreground">{entityName}</p>
            </div>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[quote.status] ?? "secondary"} className="text-sm px-3 py-1">
          {STATUS_LABELS[quote.status] ?? quote.status}
        </Badge>
      </div>

      <Separator />

      {/* Header form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">פרטי הצעה</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteHeaderForm
            quoteId={quote.id}
            clients={clientOptions}
            leadName={quote.lead?.name ?? null}
            initialValues={{
              clientId: quote.client?.id ?? "",
              date: fmtDate(quote.date),
              validUntil: fmtDate(quote.validUntil),
              status: quote.status,
              notes: quote.notes,
            }}
          />
        </CardContent>
      </Card>

      {/* Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">פריטי הצעה</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteCalculator
            quoteId={quote.id}
            initialItems={quote.items}
            catalogItems={catalogOptions}
            taxPercent={quote.taxPercent}
          />
        </CardContent>
      </Card>
    </div>
  );
}
