"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  FolderKanban,
  Plus,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { recordPayment } from "@/actions/finance";

type Payment = {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string | null;
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  description: string | null;
  date: string;
  dueDate: string | null;
  status: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  payments: Payment[];
};

const PAYMENT_METHOD_KEYS = ["BANK_TRANSFER", "CHECK", "CASH", "CREDIT_CARD", "OTHER"] as const;

const STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700 border-orange-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

export function InvoiceDetailClient({
  invoice,
  currencyCode,
  locale,
}: {
  invoice: Invoice;
  currencyCode: string;
  locale: string;
}) {
  const t = useTranslations("clients.invoices");
  const tFin = useTranslations("financialsClient");
  const router = useRouter();
  const dir = locale === "he" ? "rtl" : "ltr";
  const intlLocale = locale === "he" ? "he-IL" : "en-US";

  const fmt = (n: number) => formatCurrency(n, currencyCode, intlLocale);
  const fmtDate = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso))
      : "—";

  const balance = invoice.total - invoice.paidAmount;
  const isPaid = invoice.status === "PAID" || balance <= 0;

  // ── Record-payment dialog ──
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTx] = useTransition();

  function submitPayment() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError(tFin("paymentForm.validAmount")); return; }
    if (amt > balance + 0.01) { setError(tFin("paymentForm.amountExceedsBalance", { balance: fmt(balance) })); return; }
    setError("");
    startTx(async () => {
      const res = await recordPayment(invoice.id, { amount: amt, method, date, reference: reference || undefined });
      if (res.success) {
        setOpen(false);
        setAmount(""); setReference("");
        router.refresh();
      } else {
        setError(res.error ?? tFin("paymentForm.error"));
      }
    });
  }

  const statusCls = STATUS_CLS[invoice.status] ?? STATUS_CLS.DRAFT;
  const headline = invoice.description?.trim() || invoice.invoiceNumber;

  return (
    <div className="space-y-5 max-w-3xl" dir={dir}>
      {/* Back link */}
      {invoice.client && (
        <Link
          href={`/clients/${invoice.client.id}/invoices`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          {invoice.client.name}
        </Link>
      )}

      {/* Header card */}
      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{headline}</h1>
                <Badge variant="outline" className={`text-xs ${statusCls}`}>
                  {tFin(`invoiceStatus.${invoice.status}` as Parameters<typeof tFin>[0])}
                </Badge>
              </div>
              {invoice.description?.trim() && (
                <p className="text-sm text-muted-foreground mt-0.5" dir="ltr">{invoice.invoiceNumber}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                {invoice.client && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />{invoice.client.name}
                  </span>
                )}
                {invoice.project && (
                  <Link href={`/projects/${invoice.project.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                    <FolderKanban className="h-3.5 w-3.5" />{invoice.project.name}
                  </Link>
                )}
              </div>
            </div>
            {!isPaid && (
              <Button onClick={() => { setOpen(true); setError(""); }} className="gap-1.5">
                <Plus className="h-4 w-4" />
                {t("recordPayment")}
              </Button>
            )}
          </div>

          {/* Amount breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <Figure label={t("subtotalLabel")} value={fmt(invoice.amount)} />
            <Figure label={t("vatLine", { n: invoice.taxPercent })} value={fmt(invoice.taxAmount)} />
            <Figure label={t("totalLabel")} value={fmt(invoice.total)} strong />
            <Figure
              label={isPaid ? t("paidLabel") : t("balanceLabel")}
              value={isPaid ? fmt(invoice.paidAmount) : fmt(balance)}
              tone={isPaid ? "green" : "orange"}
            />
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-3">
            <span>{t("dateLabel")}: <span dir="ltr" className="text-foreground">{fmtDate(invoice.date)}</span></span>
            {invoice.dueDate && (
              <span>{t("dueDateLabel")}: <span dir="ltr" className="text-foreground">{fmtDate(invoice.dueDate)}</span></span>
            )}
          </div>

          {invoice.notes && (
            <p className="text-sm text-muted-foreground border-t border-border pt-3">{invoice.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Payments list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          {t("paymentsTitle")}
        </h2>
        {invoice.payments.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t("noPayments")}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start font-medium text-muted-foreground px-4 py-2.5 text-xs">{t("dateLabel")}</th>
                    <th className="text-start font-medium text-muted-foreground px-4 py-2.5 text-xs">{t("methodColumn")}</th>
                    <th className="text-start font-medium text-muted-foreground px-4 py-2.5 text-xs hidden sm:table-cell">{t("referenceColumn")}</th>
                    <th className="text-end font-medium text-muted-foreground px-4 py-2.5 text-xs">{t("amountLabel")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5" dir="ltr">{fmtDate(p.date)}</td>
                      <td className="px-4 py-2.5">{tFin(`methodLabels.${p.method}` as Parameters<typeof tFin>[0])}</td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{p.reference || "—"}</td>
                      <td className="px-4 py-2.5 text-end font-medium tabular-nums text-emerald-700">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Record payment dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("recordPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-lg bg-muted/40 border border-border px-4 py-2.5 text-xs flex justify-between">
              <span className="text-muted-foreground">{t("balanceLabel")}</span>
              <span className="font-semibold text-orange-600 tabular-nums">{fmt(balance)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("amountLabel")}</Label>
                <Input type="number" min="0" step="100" dir="ltr" placeholder="0.00"
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("methodColumn")}</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_KEYS.map((m) => (
                      <SelectItem key={m} value={m}>{tFin(`methodLabels.${m}` as Parameters<typeof tFin>[0])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("dateLabel")}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("referenceColumn")}</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("referencePlaceholder")} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={submitPayment} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
                {t("recordPayment")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Figure({
  label, value, strong, tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "green" | "orange";
}) {
  const toneCls = tone === "green" ? "text-emerald-700" : tone === "orange" ? "text-orange-600" : "text-foreground";
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${strong ? "text-base font-bold" : "text-sm font-medium"} ${toneCls}`}>{value}</p>
    </div>
  );
}
