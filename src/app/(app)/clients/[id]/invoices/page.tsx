export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClientHeader, getClientInvoices, getClientProjects } from "@/actions/clients";
import { getCurrencyCode } from "@/actions/settings";
import { fmtDate } from "@/lib/utils";
import { formatCurrencyCompact } from "@/lib/formatters";
import { CreateInvoiceDialog } from "./_components/create-invoice-dialog";

export default async function ClientInvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, invoices, projects, currencyCode, t, locale] = await Promise.all([
    getClientHeader(id),
    getClientInvoices(id),
    getClientProjects(id),
    getCurrencyCode(),
    getTranslations("clients"),
    getLocale(),
  ]);
  if (!client) notFound();

  const fmt = (n: number) => formatCurrencyCompact(n, currencyCode);

  function fmtInvoiceDate(d: Date | string | null) {
    if (!d) return "";
    const intlLocale = locale === "he" ? "he-IL" : "en-US";
    return new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(d));
  }

  const INVOICE_STATUS: Record<string, { label: string; className: string }> = {
    DRAFT:          { label: t("invoices.statusDraft"),        className: "bg-slate-100 text-slate-600 border-slate-200" },
    SENT:           { label: t("invoices.statusSent"),         className: "bg-blue-100 text-blue-700 border-blue-200" },
    PARTIALLY_PAID: { label: t("invoices.statusPartiallyPaid"),className: "bg-orange-100 text-orange-700 border-orange-200" },
    PAID:           { label: t("invoices.statusPaid"),         className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    OVERDUE:        { label: t("invoices.statusOverdue"),      className: "bg-red-100 text-red-700 border-red-200" },
    CANCELLED:      { label: t("invoices.statusCancelled"),    className: "bg-slate-100 text-slate-500 border-slate-200" },
  };

  const formattedInvoices = invoices.map((inv) => ({
    ...inv,
    dateStr:    fmtDate(inv.date),
    dueDateStr: fmtInvoiceDate(inv.dueDate),
    balance:    inv.total - inv.paidAmount,
  }));

  // KPI totals
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid     = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOpen     = totalInvoiced - totalPaid;

  return (
    <div className="space-y-4 max-w-5xl">

      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{t("invoices.count", { n: invoices.length })}</span>
          {totalInvoiced > 0 && (
            <>
              <span>{t("invoices.billed")}: <strong className="text-foreground">{fmt(totalInvoiced)}</strong></span>
              <span>{t("invoices.paid")}: <strong className="text-emerald-700">{fmt(totalPaid)}</strong></span>
              {totalOpen > 0 && (
                <span>{t("invoices.balance")}: <strong className="text-orange-600">{fmt(totalOpen)}</strong></span>
              )}
            </>
          )}
        </div>
        <CreateInvoiceDialog clientId={id} projects={projects} />
      </div>

      {/* Empty state */}
      {formattedInvoices.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-10 text-center text-muted-foreground text-sm">
            {t("invoices.empty")}
            <p className="text-xs mt-1">{t("invoices.emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {formattedInvoices.map((invoice) => {
            const statusCfg = INVOICE_STATUS[invoice.status] ?? {
              label: invoice.status,
              className: "bg-slate-100 text-slate-600 border-slate-200",
            };

            return (
              <Card key={invoice.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {invoice.description?.trim()
                            ? invoice.description
                            : (invoice.invoiceNumber ?? t("invoices.noNumber"))}
                        </Link>
                        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      {/* Invoice number shown as a sub-line when a description is present */}
                      {invoice.description?.trim() && (
                        <p className="text-xs font-medium text-muted-foreground mb-1" dir="ltr">
                          {invoice.invoiceNumber ?? t("invoices.noNumber")}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span dir="ltr">{invoice.dateStr}</span>
                        {invoice.dueDate && (
                          <span>{t("invoices.dueDateLabel")}: <span dir="ltr">{invoice.dueDateStr}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="text-end shrink-0 space-y-0.5">
                      <p className="text-sm font-bold text-foreground">{fmt(invoice.total)}</p>
                      {invoice.paidAmount > 0 && (
                        <p className="text-xs text-emerald-600">{t("invoices.paidLabel")}: {fmt(invoice.paidAmount)}</p>
                      )}
                      {invoice.balance > 0 && (
                        <p className="text-xs text-orange-500">{t("invoices.balanceLabel")}: {fmt(invoice.balance)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
