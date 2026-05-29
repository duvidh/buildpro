export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClientHeader, getClientInvoices, getClientProjects } from "@/actions/clients";
import { getCurrencyCode } from "@/actions/settings";
import { fmtDate } from "@/lib/utils";
import { formatCurrencyCompact } from "@/lib/formatters";
import { CreateInvoiceDialog } from "./_components/create-invoice-dialog";

const INVOICE_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT:          { label: "טיוטה",        className: "bg-slate-100 text-slate-600 border-slate-200" },
  SENT:           { label: "נשלחה",        className: "bg-blue-100 text-blue-700 border-blue-200" },
  PARTIALLY_PAID: { label: "שולמה חלקית", className: "bg-orange-100 text-orange-700 border-orange-200" },
  PAID:           { label: "שולמה",        className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  OVERDUE:        { label: "בפיגור",       className: "bg-red-100 text-red-700 border-red-200" },
  CANCELLED:      { label: "בוטלה",        className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default async function ClientInvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, invoices, projects, currencyCode] = await Promise.all([
    getClientHeader(id),
    getClientInvoices(id),
    getClientProjects(id),
    getCurrencyCode(),
  ]);
  if (!client) notFound();

  const fmt = (n: number) => formatCurrencyCompact(n, currencyCode);

  const formattedInvoices = invoices.map((inv) => ({
    ...inv,
    dateStr:    fmtDate(inv.date),
    dueDateStr: fmtDate(inv.dueDate),
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
          <span>{invoices.length} חשבוניות</span>
          {totalInvoiced > 0 && (
            <>
              <span>חויב: <strong className="text-foreground">{fmt(totalInvoiced)}</strong></span>
              <span>שולם: <strong className="text-emerald-700">{fmt(totalPaid)}</strong></span>
              {totalOpen > 0 && (
                <span>יתרה: <strong className="text-orange-600">{fmt(totalOpen)}</strong></span>
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
            אין חשבוניות ללקוח זה עדיין.
            <p className="text-xs mt-1">לחץ &ldquo;חשבונית חדשה&rdquo; כדי ליצור את הראשונה.</p>
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
                          {invoice.invoiceNumber ?? "חשבונית ללא מספר"}
                        </Link>
                        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span dir="ltr">{invoice.dateStr}</span>
                        {invoice.dueDate && (
                          <span>לתשלום: <span dir="ltr">{invoice.dueDateStr}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="text-end shrink-0 space-y-0.5">
                      <p className="text-sm font-bold text-foreground">{fmt(invoice.total)}</p>
                      {invoice.paidAmount > 0 && (
                        <p className="text-xs text-emerald-600">שולם: {fmt(invoice.paidAmount)}</p>
                      )}
                      {invoice.balance > 0 && (
                        <p className="text-xs text-orange-500">יתרה: {fmt(invoice.balance)}</p>
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
