"use client";

import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/currency-context";
import { QuoteHeaderForm } from "@/components/quotes/quote-header-form";
import { QuoteCalculator } from "@/components/quotes/quote-calculator";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  category: string | null;
};

type QuoteCategory = {
  id: string;
  name: string;
  order: number;
};

type QuoteItem = {
  id: string;
  categoryId: string | null;
  catalogItemId: string | null;
  name: string;
  unit: string;
  dim1: number | null;
  dim2: number | null;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  profitPercent: number;
  linePrice: number;
  order: number;
  catalogItem: { id: string; name: string; unit: string; unitCost: number } | null;
};

type Quote = {
  id: string;
  quoteNumber: string | null;
  status: string;
  total: number;
  subtotal: number;
  taxPercent: number;
  contingencyPercent: number;
  date: string;
  validUntil: string | null;
  notes: string | null;
  client: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
  categories: QuoteCategory[];
  items: QuoteItem[];
};

type Props = {
  quote: Quote;
  catalogItems: CatalogItem[];
  clientId: string;
  clientName: string;
};

// ─── Status CSS (labels come from t()) ───────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  DRAFT:    "bg-slate-100 text-slate-600 border-slate-200",
  SENT:     "bg-blue-100 text-blue-700 border-blue-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  EXPIRED:  "bg-orange-100 text-orange-700 border-orange-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteInlineWorkspace({ quote, catalogItems, clientId, clientName }: Props) {
  const { fmtCompact } = useCurrency();
  const t       = useTranslations("clients");
  const tQuotes = useTranslations("quotes");
  const locale  = useLocale();
  const dir     = locale === "he" ? "rtl" : "ltr";

  const statusLabel = tQuotes(`status.${quote.status as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"}`);
  const statusCls   = STATUS_CLS[quote.status] ?? STATUS_CLS.DRAFT;

  function isoDate(d: string | null | undefined) {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  }

  return (
    <div className="p-4 space-y-5" dir={dir}>
      {/* ── Quote summary banner ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-foreground">
            {quote.quoteNumber ?? t("quotesList.quoteTitle")}
          </span>
          <Badge variant="outline" className={`text-xs ${statusCls}`}>
            {statusLabel}
          </Badge>
        </div>
        <div className="text-end">
          <span className="text-lg font-bold text-primary">{fmtCompact(quote.total)}</span>
          <span className="text-xs text-muted-foreground ms-1.5">
            ({t("quotesList.vatIncluded", { n: quote.taxPercent })})
          </span>
        </div>
      </div>

      <Separator />

      {/* ── Header form (auto-saves on change) ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("quotesList.quoteDetails")}
        </p>
        <QuoteHeaderForm
          quoteId={quote.id}
          clients={[{ id: clientId, name: clientName }]}
          leadName={quote.lead?.name ?? null}
          initialValues={{
            clientId:   quote.client?.id ?? clientId,
            date:       isoDate(quote.date),
            validUntil: isoDate(quote.validUntil),
            status:     quote.status,
            notes:      quote.notes,
          }}
        />
      </div>

      <Separator />

      {/* ── BoQ Calculator ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("quotesList.quoteItems")}
        </p>
        <QuoteCalculator
          quoteId={quote.id}
          initialItems={quote.items}
          initialCategories={quote.categories}
          catalogItems={catalogItems}
          taxPercent={quote.taxPercent}
          initialContingencyPercent={quote.contingencyPercent ?? 0}
          quoteNumber={quote.quoteNumber}
          clientName={quote.client?.name ?? clientName}
          date={isoDate(quote.date)}
          validUntil={isoDate(quote.validUntil)}
          notes={quote.notes}
        />
      </div>
    </div>
  );
}
