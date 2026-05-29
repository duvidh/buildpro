"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SplitViewLayout } from "@/components/layout/split-view-layout";
import { QuoteInlineWorkspace } from "./quote-inline-workspace";
import { CreateQuoteButton } from "./create-quote-button";
import { useCurrency } from "@/lib/currency-context";
import { cn } from "@/lib/utils";
import { ChevronLeft, FileEdit } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteSummary = {
  id: string;
  quoteNumber: string | null;
  date: string;
  validUntil: string | null;
  status: string;
  total: number;
};

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

type FullQuote = {
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
  clientId: string;
  clientName: string;
  quotes: QuoteSummary[];
  selectedQuoteId: string | null;
  selectedQuote: FullQuote | null;
  catalogItems: CatalogItem[];
};

// ─── Status CSS (labels come from t()) ───────────────────────────────────────

const QUOTE_STATUS_CLS: Record<string, string> = {
  DRAFT:    "bg-slate-100 text-slate-600 border-slate-200",
  SENT:     "bg-blue-100 text-blue-700 border-blue-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  EXPIRED:  "bg-orange-100 text-orange-700 border-orange-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuotesSplitClient({
  clientId,
  clientName,
  quotes,
  selectedQuoteId,
  selectedQuote,
  catalogItems,
}: Props) {
  const { fmtCompact } = useCurrency();
  const router   = useRouter();
  const pathname = usePathname();
  const t        = useTranslations("clients");
  const tQuotes  = useTranslations("quotes");
  const locale   = useLocale();
  const dir      = locale === "he" ? "rtl" : "ltr";

  function fmtDate(d: string | null) {
    if (!d) return "";
    const intlLocale = locale === "he" ? "he-IL" : "en-US";
    return new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(d));
  }

  function selectQuote(id: string) {
    if (id === selectedQuoteId) {
      router.push(pathname, { scroll: false });
    } else {
      router.push(`${pathname}?selectedQuoteId=${id}`, { scroll: false });
    }
  }

  function closeDetail() {
    router.push(pathname, { scroll: false });
  }

  // ── Master ──────────────────────────────────────────────────────────────────
  const master = (
    <div className="space-y-2 pb-2">
      {/* Header row */}
      <div className="flex items-center justify-between py-1">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("quotesList.count", { n: quotes.length })}
        </h2>
        <CreateQuoteButton clientId={clientId} />
      </div>

      {quotes.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {t("quotesList.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {quotes.map((quote) => {
            const statusCls   = QUOTE_STATUS_CLS[quote.status] ?? QUOTE_STATUS_CLS.DRAFT;
            const statusLabel = tQuotes(`status.${quote.status as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"}`);
            const isSelected  = quote.id === selectedQuoteId;

            return (
              <button
                key={quote.id}
                type="button"
                onClick={() => selectQuote(quote.id)}
                className={cn(
                  "w-full text-start rounded-xl border transition-all duration-200",
                  "hover:shadow-md hover:border-primary/30",
                  isSelected
                    ? "border-primary/50 bg-primary/5 shadow-md ring-1 ring-primary/20"
                    : "border-border bg-card shadow-sm",
                )}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {quote.quoteNumber ?? t("quotesList.noNumber")}
                        </span>
                        <Badge variant="outline" className={`text-xs ${statusCls}`}>
                          {statusLabel}
                        </Badge>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                            <FileEdit className="h-3 w-3" />
                            {t("quotesList.editing")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span dir="ltr">{fmtDate(quote.date)}</span>
                        {quote.validUntil && (
                          <span>{t("quotesList.validUntil")} <span dir="ltr">{fmtDate(quote.validUntil)}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-bold text-foreground">{fmtCompact(quote.total)}</p>
                      {isSelected && (
                        <ChevronLeft className="h-4 w-4 text-primary rotate-90" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Detail ──────────────────────────────────────────────────────────────────
  const detail = (selectedQuote && selectedQuoteId) ? (
    <QuoteInlineWorkspace
      quote={selectedQuote}
      catalogItems={catalogItems}
      clientId={clientId}
      clientName={clientName}
    />
  ) : null;

  const selectedQuoteNum = quotes.find((q) => q.id === selectedQuoteId)?.quoteNumber;

  return (
    <div className="max-w-5xl" dir={dir}>
      <SplitViewLayout
        master={master}
        detail={detail}
        detailTitle={selectedQuoteNum
          ? t("quotesList.editorTitle", { number: selectedQuoteNum })
          : t("quotesList.editorTitleNoNumber")}
        onClose={closeDetail}
        masterMaxHeight={selectedQuoteId ? "220px" : undefined}
      />
    </div>
  );
}
