"use client";

import { useRouter, usePathname } from "next/navigation";
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

// ─── Status config ────────────────────────────────────────────────────────────

const QUOTE_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: "טיוטה",    className: "bg-slate-100 text-slate-600 border-slate-200" },
  SENT:     { label: "נשלחה",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  ACCEPTED: { label: "אושרה",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "נדחתה",   className: "bg-red-100 text-red-700 border-red-200" },
  EXPIRED:  { label: "פג תוקף", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(d));
}

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
          {quotes.length} הצעות מחיר
        </h2>
        <CreateQuoteButton clientId={clientId} />
      </div>

      {quotes.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            אין הצעות מחיר ללקוח זה עדיין.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {quotes.map((quote) => {
            const statusCfg  = QUOTE_STATUS[quote.status] ?? QUOTE_STATUS.DRAFT;
            const isSelected = quote.id === selectedQuoteId;

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
                          {quote.quoteNumber ?? "הצעה ללא מספר"}
                        </span>
                        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                          {statusCfg.label}
                        </Badge>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                            <FileEdit className="h-3 w-3" />
                            עורך
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span dir="ltr">{fmtDate(quote.date)}</span>
                        {quote.validUntil && (
                          <span>בתוקף עד: <span dir="ltr">{fmtDate(quote.validUntil)}</span></span>
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
    <div className="max-w-5xl" dir="rtl">
      <SplitViewLayout
        master={master}
        detail={detail}
        detailTitle={selectedQuoteNum ? `עורך הצעה — ${selectedQuoteNum}` : "עורך הצעה"}
        onClose={closeDetail}
        masterMaxHeight={selectedQuoteId ? "220px" : undefined}
      />
    </div>
  );
}
