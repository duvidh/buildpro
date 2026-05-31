"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Lock,
  Plus,
  Loader2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
} from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { recordPayment, recordSupplierPayment } from "@/actions/finance";
import type { ProjectFinancialSummary } from "@/actions/finance-analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoicePayment = {
  id: string;
  date: string;
  amount: number;
  method: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string | null;
  status: string;
  amount: number;
  total: number;
  paidAmount: number;
  payments: InvoicePayment[];
};

type ContractPayment = {
  id: string;
  date: string;
  amount: number;
};

type ProjectContract = {
  id: string;
  description: string | null;
  value: number;
  paidAmount: number;
  status: string;
  retentionPercent: number;
  supplier: { id: string; name: string; type: string };
  payments: ContractPayment[];
};

export type FinancialsData = {
  contractValue: number;
  invoices: Invoice[];
  contracts: ProjectContract[];
  /** Pre-aggregated KPIs — computed server-side via Prisma aggregate queries */
  summary: ProjectFinancialSummary;
};

// ─── Config (colors only, no Hebrew labels) ───────────────────────────────────

const INVOICE_STATUS_CLS: Record<string, string> = {
  DRAFT:          "bg-slate-100 text-slate-600 border-slate-200",
  SENT:           "bg-blue-100 text-blue-700 border-blue-200",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700 border-orange-200",
  PAID:           "bg-emerald-100 text-emerald-700 border-emerald-200",
  OVERDUE:        "bg-red-100 text-red-700 border-red-200",
  CANCELLED:      "bg-slate-100 text-slate-500 border-slate-200",
};

const CONTRACT_STATUS_CLS: Record<string, string> = {
  DRAFT:      "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVE:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-blue-100 text-blue-700 border-blue-200",
  TERMINATED: "bg-red-100 text-red-700 border-red-200",
};

const PAYMENT_METHOD_KEYS = [
  "BANK_TRANSFER",
  "CHECK",
  "CASH",
  "CREDIT_CARD",
  "OTHER",
] as const;

// ─── InlineInvoicePaymentRow ──────────────────────────────────────────────────

function InlineInvoicePaymentRow({
  invoice,
  onSuccess,
}: {
  invoice: Invoice;
  onSuccess: () => void;
}) {
  const t = useTranslations("financialsClient");
  const { fmtCompact } = useCurrency();
  const [open, setOpen]           = useState(false);
  const [isPending, startTx]      = useTransition();
  const [amount, setAmount]       = useState("");
  const [method, setMethod]       = useState("BANK_TRANSFER");
  const [date, setDate]           = useState(() => new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [error, setError]         = useState("");

  const isPaid  = invoice.status === "PAID";
  const balance = invoice.total - invoice.paidAmount;
  const stCls   = INVOICE_STATUS_CLS[invoice.status] ?? "";
  const stLabel = t(`invoiceStatus.${invoice.status}` as Parameters<typeof t>[0]) || invoice.status;
  const bal     = invoice.total - invoice.paidAmount;

  function handleOpen() {
    setOpen(true);
    setAmount("");
    setReference("");
    setError("");
  }

  function handleCancel() {
    setOpen(false);
    setError("");
  }

  function submit() {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError(t("paymentForm.validAmount"));
      return;
    }
    if (amountNum > balance + 0.01) {
      setError(t("paymentForm.amountExceedsBalance", { balance: fmtCompact(balance) }));
      return;
    }
    setError("");
    startTx(async () => {
      const res = await recordPayment(invoice.id, { amount: amountNum, method, date, reference: reference || undefined });
      if (res.success) { setOpen(false); onSuccess(); }
      else             { setError((res as { error?: string }).error ?? t("paymentForm.error")); }
    });
  }

  return (
    <>
      {/* Main row */}
      <tr className="hover:bg-muted/20">
        <td className="px-3 py-2.5 font-medium">{invoice.invoiceNumber}</td>
        <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmtDate(invoice.date)}</td>
        <td className="px-3 py-2.5">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${stCls}`}>
            {stLabel}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-end tabular-nums">{fmtCompact(invoice.total)}</td>
        <td className="px-3 py-2.5 text-end tabular-nums text-emerald-700">
          {invoice.paidAmount > 0 ? fmtCompact(invoice.paidAmount) : "—"}
        </td>
        <td className="px-3 py-2.5 text-end tabular-nums">
          {bal > 0
            ? <span className="text-orange-600 font-medium">{fmtCompact(bal)}</span>
            : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-3 py-2.5 text-center">
          {isPaid ? (
            <div className="flex items-center justify-center gap-1 text-muted-foreground" title={t("paidFull")}>
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">{t("invoiceStatus.PAID")}</span>
            </div>
          ) : open ? (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={handleOpen}>
              <Plus className="h-3 w-3" />
              {t("payment")}
            </Button>
          )}
        </td>
      </tr>

      {/* Inline payment form row */}
      {open && !isPaid && (
        <tr>
          <td colSpan={7} className="px-3 pb-3 pt-0 bg-emerald-50/50 border-b border-emerald-100">
            <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-3">
              <p className="text-xs font-medium text-emerald-700">
                {t("paymentForm.title", { number: invoice.invoiceNumber, balance: fmtCompact(balance) })}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.amount")}</Label>
                  <Input
                    type="number" min="0" step="0.01" dir="ltr" className="h-7 text-xs"
                    placeholder={String(balance.toFixed(2))}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.date")}</Label>
                  <Input type="date" className="h-7 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.method")}</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_KEYS.map((val) => (
                        <SelectItem key={val} value={val} className="text-xs">
                          {t(`methodLabels.${val}` as Parameters<typeof t>[0])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.reference")}</Label>
                  <Input
                    className="h-7 text-xs" placeholder={t("paymentForm.refPlaceholder")} dir="ltr"
                    value={reference} onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={isPending}>
                  {isPending && <Loader2 className="h-3 w-3 animate-spin me-1" />}
                  {t("paymentForm.save")}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>
                  {t("paymentForm.cancel")}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── InlineContractPaymentRow ─────────────────────────────────────────────────

function InlineContractPaymentRow({
  contract,
  onSuccess,
}: {
  contract: ProjectContract;
  onSuccess: () => void;
}) {
  const t = useTranslations("financialsClient");
  const { fmtCompact } = useCurrency();
  const [open, setOpen]           = useState(false);
  const [isPending, startTx]      = useTransition();
  const [amount, setAmount]       = useState("");
  const [date, setDate]           = useState(() => new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes]         = useState("");
  const [error, setError]         = useState("");

  const csCls    = CONTRACT_STATUS_CLS[contract.status] ?? "";
  const csLabel  = t(`contractStatus.${contract.status}` as Parameters<typeof t>[0], undefined, { fallback: contract.status });
  const balance  = contract.value - contract.paidAmount;
  const settled  = balance <= 0;

  function handleOpen() {
    setOpen(true);
    setAmount("");
    setReference("");
    setNotes("");
    setError("");
  }

  function submit() {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError(t("paymentForm.validAmount"));
      return;
    }
    setError("");
    startTx(async () => {
      const res = await recordSupplierPayment(contract.id, {
        amount:    amountNum,
        date,
        reference: reference || undefined,
        notes:     notes     || undefined,
      });
      if (res.success) { setOpen(false); onSuccess(); }
      else             { setError((res as { error?: string }).error ?? t("paymentForm.error")); }
    });
  }

  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-3 py-2.5 font-medium">{contract.supplier.name}</td>
        <td className="px-3 py-2.5">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${csCls}`}>
            {csLabel}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-end tabular-nums">{fmtCompact(contract.value)}</td>
        <td className="px-3 py-2.5 text-end tabular-nums text-emerald-700">
          {contract.paidAmount > 0 ? fmtCompact(contract.paidAmount) : "—"}
        </td>
        <td className="px-3 py-2.5 text-end tabular-nums text-muted-foreground">
          {contract.retentionPercent > 0 ? `${contract.retentionPercent}%` : "—"}
        </td>
        <td className="px-3 py-2.5 text-center">
          {settled ? (
            <div className="flex items-center justify-center gap-1 text-muted-foreground" title={t("settled")}>
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">{t("settled")}</span>
            </div>
          ) : open ? (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={handleOpen}>
              <Plus className="h-3 w-3" />
              {t("payment")}
            </Button>
          )}
        </td>
      </tr>

      {/* Inline payment form */}
      {open && !settled && (
        <tr>
          <td colSpan={6} className="px-3 pb-3 pt-0 bg-red-50/50 border-b border-red-100">
            <div className="rounded-lg border border-red-200 bg-white p-3 space-y-3">
              <p className="text-xs font-medium text-red-700">
                {t("paymentForm.supplierTitle", { name: contract.supplier.name, balance: fmtCompact(Math.max(0, balance)) })}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.amount")}</Label>
                  <Input
                    type="number" min="0" step="0.01" dir="ltr" className="h-7 text-xs"
                    placeholder={String(Math.max(0, balance).toFixed(2))}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.date")}</Label>
                  <Input type="date" className="h-7 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.reference")}</Label>
                  <Input
                    className="h-7 text-xs" placeholder={t("paymentForm.refPlaceholder")} dir="ltr"
                    value={reference} onChange={(e) => setReference(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t("paymentForm.notes")}</Label>
                  <Input
                    className="h-7 text-xs" placeholder={t("paymentForm.notesPlaceholder")}
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={isPending}>
                  {isPending && <Loader2 className="h-3 w-3 animate-spin me-1" />}
                  {t("paymentForm.savePayment")}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
                  {t("paymentForm.cancel")}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── CashFlowBar ──────────────────────────────────────────────────────────────

function CashFlowBar({
  label, icon: Icon, iconClass, total, paid, paidLabel, remainLabel,
  barClass, trackClass, remainClass, settledLabel, totalLabel,
}: {
  label: string; icon: React.ElementType; iconClass: string;
  total: number; paid: number; paidLabel: string; remainLabel: string;
  barClass: string; trackClass: string; remainClass: string;
  settledLabel: string; totalLabel: string;
}) {
  const { fmtCompact } = useCurrency();
  const pct    = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const remain = Math.max(0, total - paid);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${trackClass}`}>
            <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span>{paidLabel}: <strong className="text-foreground tabular-nums">{fmtCompact(paid)}</strong></span>
          <span>{totalLabel}: <strong className="text-foreground tabular-nums">{fmtCompact(total)}</strong></span>
        </div>
      </div>
      <div className={`relative h-4 rounded-full overflow-hidden ${trackClass}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct.toFixed(2)}%` }} />
        {pct >= 15 && (
          <span className="absolute inset-0 flex items-center ps-2.5 text-[10px] font-semibold text-white/90 select-none">
            {pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{paidLabel}: <span className="tabular-nums font-medium">{fmtCompact(paid)}</span></span>
        {remain > 0
          ? <span className={`font-semibold tabular-nums ${remainClass}`}>{remainLabel}: {fmtCompact(remain)}</span>
          : <span className="text-emerald-600 font-medium text-[11px]">{settledLabel}</span>
        }
      </div>
    </div>
  );
}

// ─── FinancialsClient ─────────────────────────────────────────────────────────

export function FinancialsClient({
  projectId: _projectId,
  data,
}: {
  projectId: string;
  data: FinancialsData;
}) {
  const t = useTranslations("financialsClient");
  const { fmtCompact } = useCurrency();
  const router = useRouter();
  const { contractValue, invoices, contracts, summary } = data;
  const {
    laborCost, fieldExpCost, subContractValue, subCostPaid,
    invoicedTotal, invoicePaidTotal, budgetAdditions,
  } = summary;

  const budget       = contractValue + budgetAdditions;
  const actualCost   = laborCost + fieldExpCost + subCostPaid;
  const grossProfit  = budget - actualCost;
  const profitMargin = budget > 0 ? (grossProfit / budget) * 100 : 0;
  const outstanding  = Math.max(0, invoicedTotal - invoicePaidTotal);
  const isProfit     = grossProfit >= 0;

  const accountsReceivable = Math.max(0, invoicedTotal - invoicePaidTotal);
  const accountsPayable    = Math.max(0, subContractValue - subCostPaid);
  const netCashPosition    = accountsReceivable - accountsPayable;

  const costBreakdown = [
    { labelKey: "labor",        value: laborCost,    color: "bg-violet-400" },
    { labelKey: "fieldExpenses",value: fieldExpCost, color: "bg-orange-400" },
    { labelKey: "subContractors",value: subCostPaid, color: "bg-blue-400" },
  ];

  return (
    <div className="space-y-6">

      {/* ── P&L KPI Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: t("approvedBudget"),
            value: budget > 0 ? fmtCompact(budget) : t("notDefined"),
            sub:   budgetAdditions !== 0
              ? t("includesChanges", { amount: fmtCompact(budgetAdditions) })
              : t("baseContractValue"),
            icon: Wallet,
            bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700",
          },
          {
            label: t("actualCosts"),
            value: actualCost > 0 ? fmtCompact(actualCost) : fmtCompact(0),
            sub:   t("laborFieldSubs"),
            icon: TrendingDown,
            bg: "bg-orange-50", iconColor: "text-orange-500", valueColor: "text-orange-700",
          },
          {
            label: t("grossProfit"),
            value: budget > 0 ? fmtCompact(grossProfit) : "—",
            sub:   budget > 0 ? t("margin", { pct: profitMargin.toFixed(1) }) : t("defineContract"),
            icon:       isProfit ? TrendingUp : TrendingDown,
            bg:         isProfit ? "bg-emerald-50" : "bg-red-50",
            iconColor:  isProfit ? "text-emerald-600" : "text-red-500",
            valueColor: isProfit ? "text-emerald-700" : "text-red-700",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-bold tabular-nums leading-tight ${kpi.valueColor}`}>{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Cost Breakdown bars ── */}
      {actualCost > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t("costBreakdown")}</h4>
          <div className="space-y-2.5">
            {costBreakdown.map(({ labelKey, value, color }) => {
              const label = t(labelKey as Parameters<typeof t>[0]);
              const pct = actualCost > 0 ? (value / actualCost) * 100 : 0;
              return (
                <div key={labelKey}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-medium">{fmtCompact(value)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct.toFixed(2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Cash Flow Forecast ── */}
      {(invoicedTotal > 0 || subContractValue > 0) && (
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            {t("cashFlow")}
          </h4>
          <div className="rounded-xl border border-border bg-white/70 dark:bg-background/70 shadow-sm p-5 space-y-5">
            {invoicedTotal > 0 && (
              <CashFlowBar
                label={t("arLabel")} icon={ArrowDownLeft} iconClass="text-emerald-600"
                total={invoicedTotal} paid={invoicePaidTotal}
                paidLabel={t("received")} remainLabel={t("remaining")}
                barClass="bg-emerald-500" trackClass="bg-emerald-100" remainClass="text-orange-600"
                settledLabel={t("settledFull")} totalLabel={t("totalLabel")}
              />
            )}
            {subContractValue > 0 && (
              <CashFlowBar
                label={t("apLabel")} icon={ArrowUpRight} iconClass="text-red-500"
                total={subContractValue} paid={subCostPaid}
                paidLabel={t("paid")} remainLabel={t("remainingToPay")}
                barClass="bg-red-400" trackClass="bg-red-100" remainClass="text-blue-600"
                settledLabel={t("settledFull")} totalLabel={t("totalLabel")}
              />
            )}
            {invoicedTotal > 0 && subContractValue > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t("netCashPosition")}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                      {netCashPosition >= 0 ? t("positiveCash") : t("negativeCash")}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500 me-1 align-middle" />
                        AR: <strong className="text-orange-600 tabular-nums">{fmtCompact(accountsReceivable)}</strong>
                      </span>
                      <span>
                        <span className="inline-block h-1.5 w-3 rounded-full bg-red-400 me-1 align-middle" />
                        AP: <strong className="text-blue-600 tabular-nums">{fmtCompact(accountsPayable)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className={`shrink-0 rounded-xl px-5 py-3 text-center border ${
                    netCashPosition >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                  }`}>
                    <p className={`text-[11px] font-medium mb-1 ${netCashPosition >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {netCashPosition >= 0 ? t("surplus") : t("deficit")}
                    </p>
                    <p className={`text-xl font-bold tabular-nums leading-none ${netCashPosition >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {netCashPosition >= 0 ? "+" : ""}
                      {fmtCompact(Math.abs(netCashPosition))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Invoices table ── */}
      {invoices.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground">{t("invoicesAndReceipts")}</h4>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{t("billed")}: <strong className="text-foreground">{fmtCompact(invoicedTotal)}</strong></span>
              <span>{t("paid")}: <strong className="text-emerald-700">{fmtCompact(invoicePaidTotal)}</strong></span>
              {outstanding > 0 && <span>{t("balanceLabel")}: <strong className="text-orange-600">{fmtCompact(outstanding)}</strong></span>}
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      { key: "colInvoiceNo", align: "text-start" },
                      { key: "colDate",      align: "text-start" },
                      { key: "colStatus",    align: "text-start" },
                      { key: "colAmount",    align: "text-end"   },
                      { key: "colPaid",      align: "text-end"   },
                      { key: "colBalance",   align: "text-end"   },
                      { key: "colAction",    align: "text-center"},
                    ].map(({ key, align }) => (
                      <th key={key} className={`font-medium text-muted-foreground px-3 py-2 text-xs ${align}`}>
                        {t(key as Parameters<typeof t>[0])}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <InlineInvoicePaymentRow
                      key={inv.id}
                      invoice={inv}
                      onSuccess={() => router.refresh()}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {invoices.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 px-1">{t("noInvoices")}</p>
      )}

      {/* ── Subcontractor contracts table ── */}
      {contracts.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t("subContracts")}</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      { key: "colSupplier",      align: "text-start" },
                      { key: "colStatus",        align: "text-start" },
                      { key: "colContractValue", align: "text-end"   },
                      { key: "colPaid",          align: "text-end"   },
                      { key: "colRetention",     align: "text-end"   },
                      { key: "colAction",        align: "text-center"},
                    ].map(({ key, align }) => (
                      <th key={key} className={`font-medium text-muted-foreground px-3 py-2 text-xs ${align}`}>
                        {t(key as Parameters<typeof t>[0])}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contracts.map((c) => (
                    <InlineContractPaymentRow
                      key={c.id}
                      contract={c}
                      onSuccess={() => router.refresh()}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
