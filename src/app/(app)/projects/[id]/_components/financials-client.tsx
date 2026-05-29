"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

// ─── Config ───────────────────────────────────────────────────────────────────

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: "טיוטה",        cls: "bg-slate-100 text-slate-600 border-slate-200" },
  SENT:           { label: "נשלחה",        cls: "bg-blue-100 text-blue-700 border-blue-200" },
  PARTIALLY_PAID: { label: "שולמה חלקית", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  PAID:           { label: "שולמה",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  OVERDUE:        { label: "בפיגור",       cls: "bg-red-100 text-red-700 border-red-200" },
  CANCELLED:      { label: "בוטלה",        cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const CONTRACT_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:      { label: "טיוטה",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  ACTIVE:     { label: "פעיל",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  COMPLETED:  { label: "הושלם",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  TERMINATED: { label: "הופסק",  cls: "bg-red-100 text-red-700 border-red-200" },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "העברה בנקאית",
  CHECK:         "צ׳ק",
  CASH:          "מזומן",
  CREDIT_CARD:   "כרטיס אשראי",
  OTHER:         "אחר",
};

// ─── InlineInvoicePaymentRow ──────────────────────────────────────────────────

function InlineInvoicePaymentRow({
  invoice,
  onSuccess,
}: {
  invoice: Invoice;
  onSuccess: () => void;
}) {
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
  const st      = INVOICE_STATUS[invoice.status] ?? { label: invoice.status, cls: "" };
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
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setError("הכנס סכום תקין"); return; }
    if (amountNum > balance + 0.01)                    { setError(`הסכום גבוה מהיתרה (${fmtCompact(balance)})`); return; }
    setError("");
    startTx(async () => {
      const res = await recordPayment(invoice.id, { amount: amountNum, method, date, reference: reference || undefined });
      if (res.success) { setOpen(false); onSuccess(); }
      else             { setError((res as { error?: string }).error ?? "שגיאה"); }
    });
  }

  return (
    <>
      {/* Main row */}
      <tr className="hover:bg-muted/20">
        <td className="px-3 py-2.5 font-medium">{invoice.invoiceNumber}</td>
        <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmtDate(invoice.date)}</td>
        <td className="px-3 py-2.5">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${st.cls}`}>
            {st.label}
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
            <div className="flex items-center justify-center gap-1 text-muted-foreground" title="שולמה במלואה">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">שולמה</span>
            </div>
          ) : open ? (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={handleOpen}>
              <Plus className="h-3 w-3" />
              תשלום
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
                רישום תקבול — חשבונית #{invoice.invoiceNumber} · יתרה: {fmtCompact(balance)}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">סכום *</Label>
                  <Input
                    type="number" min="0" step="0.01" dir="ltr" className="h-7 text-xs"
                    placeholder={String(balance.toFixed(2))}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">תאריך *</Label>
                  <Input type="date" className="h-7 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">אמצעי תשלום</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">אסמכתא</Label>
                  <Input
                    className="h-7 text-xs" placeholder="מס׳ שיק / אסמכתא" dir="ltr"
                    value={reference} onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={isPending}>
                  {isPending && <Loader2 className="h-3 w-3 animate-spin me-1" />}
                  שמור תקבול
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>
                  ביטול
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
  const { fmtCompact } = useCurrency();
  const [open, setOpen]           = useState(false);
  const [isPending, startTx]      = useTransition();
  const [amount, setAmount]       = useState("");
  const [date, setDate]           = useState(() => new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes]         = useState("");
  const [error, setError]         = useState("");

  const cs      = CONTRACT_STATUS[contract.status] ?? { label: contract.status, cls: "" };
  const balance = contract.value - contract.paidAmount;
  const settled = balance <= 0;

  function handleOpen() {
    setOpen(true);
    setAmount("");
    setReference("");
    setNotes("");
    setError("");
  }

  function submit() {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setError("הכנס סכום תקין"); return; }
    setError("");
    startTx(async () => {
      const res = await recordSupplierPayment(contract.id, {
        amount:    amountNum,
        date,
        reference: reference || undefined,
        notes:     notes     || undefined,
      });
      if (res.success) { setOpen(false); onSuccess(); }
      else             { setError((res as { error?: string }).error ?? "שגיאה"); }
    });
  }

  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-3 py-2.5 font-medium">{contract.supplier.name}</td>
        <td className="px-3 py-2.5">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${cs.cls}`}>
            {cs.label}
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
            <div className="flex items-center justify-center gap-1 text-muted-foreground" title="מסולק במלואו">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">מסולק</span>
            </div>
          ) : open ? (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={handleOpen}>
              <Plus className="h-3 w-3" />
              תשלום
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
                רישום תשלום — {contract.supplier.name} · יתרה: {fmtCompact(Math.max(0, balance))}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">סכום *</Label>
                  <Input
                    type="number" min="0" step="0.01" dir="ltr" className="h-7 text-xs"
                    placeholder={String(Math.max(0, balance).toFixed(2))}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">תאריך *</Label>
                  <Input type="date" className="h-7 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">אסמכתא</Label>
                  <Input
                    className="h-7 text-xs" placeholder="מס׳ שיק / אסמכתא" dir="ltr"
                    value={reference} onChange={(e) => setReference(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">הערות</Label>
                  <Input
                    className="h-7 text-xs" placeholder="הערה אופציונלית"
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={isPending}>
                  {isPending && <Loader2 className="h-3 w-3 animate-spin me-1" />}
                  שמור תשלום
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
                  ביטול
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
  barClass, trackClass, remainClass,
}: {
  label: string; icon: React.ElementType; iconClass: string;
  total: number; paid: number; paidLabel: string; remainLabel: string;
  barClass: string; trackClass: string; remainClass: string;
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
          <span>סה״כ: <strong className="text-foreground tabular-nums">{fmtCompact(total)}</strong></span>
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
          : <span className="text-emerald-600 font-medium text-[11px]">✓ מסולק במלואו</span>
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
  const { fmtCompact, fmtAmount } = useCurrency();
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
    { label: "עבודה",      value: laborCost,    color: "bg-violet-400" },
    { label: "הוצאות שטח", value: fieldExpCost, color: "bg-orange-400" },
    { label: "קבלני משנה", value: subCostPaid,  color: "bg-blue-400" },
  ];

  return (
    <div className="space-y-6">

      {/* ── P&L KPI Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "תקציב מאושר",
            value: budget > 0 ? fmtCompact(budget) : "לא הוגדר",
            sub:   budgetAdditions !== 0 ? `כולל שינויים ${fmtCompact(budgetAdditions)}` : "ערך חוזה בסיסי",
            icon: Wallet,
            bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700",
          },
          {
            label: "עלויות בפועל",
            value: actualCost > 0 ? fmtCompact(actualCost) : fmtCompact(0),
            sub:   "עבודה + שטח + קבלנים",
            icon: TrendingDown,
            bg: "bg-orange-50", iconColor: "text-orange-500", valueColor: "text-orange-700",
          },
          {
            label: "רווח גולמי",
            value: budget > 0 ? fmtCompact(grossProfit) : "—",
            sub:   budget > 0 ? `מרווח ${profitMargin.toFixed(1)}%` : "הגדר ערך חוזה",
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
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">פירוט עלויות</h4>
          <div className="space-y-2.5">
            {costBreakdown.map(({ label, value, color }) => {
              const pct = actualCost > 0 ? (value / actualCost) * 100 : 0;
              return (
                <div key={label}>
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
            תזרים מזומנים (Cash Flow)
          </h4>
          <div className="rounded-xl border border-border bg-white/70 dark:bg-background/70 shadow-sm p-5 space-y-5">
            {invoicedTotal > 0 && (
              <CashFlowBar
                label="תקבולים מלקוחות (AR)" icon={ArrowDownLeft} iconClass="text-emerald-600"
                total={invoicedTotal} paid={invoicePaidTotal}
                paidLabel="התקבל" remainLabel="יתרה לגביה"
                barClass="bg-emerald-500" trackClass="bg-emerald-100" remainClass="text-orange-600"
              />
            )}
            {subContractValue > 0 && (
              <CashFlowBar
                label="תשלומים לקבלנים (AP)" icon={ArrowUpRight} iconClass="text-red-500"
                total={subContractValue} paid={subCostPaid}
                paidLabel="שולם" remainLabel="יתרה לתשלום"
                barClass="bg-red-400" trackClass="bg-red-100" remainClass="text-blue-600"
              />
            )}
            {invoicedTotal > 0 && subContractValue > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-foreground">פוזיציית מזומנים נטו (AR − AP)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                      {netCashPosition >= 0
                        ? "צפי חיובי — יתרת גביה עולה על יתרת תשלומים לקבלנים"
                        : "צפי שלילי — יתרת תשלומים לקבלנים עולה על יתרת גביה מלקוחות"}
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
                      {netCashPosition >= 0 ? "עודף" : "גירעון"}
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
            <h4 className="text-sm font-semibold text-muted-foreground">חשבוניות ותקבולים</h4>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>חויב: <strong className="text-foreground">{fmtCompact(invoicedTotal)}</strong></span>
              <span>שולם: <strong className="text-emerald-700">{fmtCompact(invoicePaidTotal)}</strong></span>
              {outstanding > 0 && <span>יתרה: <strong className="text-orange-600">{fmtCompact(outstanding)}</strong></span>}
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      { h: "מס׳ חשבונית", align: "text-start" },
                      { h: "תאריך",        align: "text-start" },
                      { h: "סטטוס",        align: "text-start" },
                      { h: "סכום",         align: "text-end"   },
                      { h: "שולם",         align: "text-end"   },
                      { h: "יתרה",         align: "text-end"   },
                      { h: "פעולה",        align: "text-center"},
                    ].map(({ h, align }) => (
                      <th key={h} className={`font-medium text-muted-foreground px-3 py-2 text-xs ${align}`}>{h}</th>
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
        <p className="text-xs text-muted-foreground py-2 px-1">אין חשבוניות עדיין לפרויקט זה.</p>
      )}

      {/* ── Subcontractor contracts table ── */}
      {contracts.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">חוזי קבלני משנה</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      { h: "ספק / קבלן", align: "text-start" },
                      { h: "סטטוס",      align: "text-start" },
                      { h: "שווי חוזה",  align: "text-end"   },
                      { h: "שולם",       align: "text-end"   },
                      { h: "עכבון %",    align: "text-end"   },
                      { h: "פעולה",      align: "text-center"},
                    ].map(({ h, align }) => (
                      <th key={h} className={`font-medium text-muted-foreground px-3 py-2 text-xs ${align}`}>{h}</th>
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
