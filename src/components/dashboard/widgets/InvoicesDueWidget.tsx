"use client";

import Link from "next/link";
import { useCurrency } from "@/lib/currency-context";
import { ChevronLeft, AlertCircle, Clock } from "lucide-react";
import type { DashboardData } from "./types";

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  SENT:           { label: "נשלחה",       dot: "bg-blue-400" },
  PARTIALLY_PAID: { label: "שולמה חלקית", dot: "bg-orange-400" },
  OVERDUE:        { label: "בפיגור",       dot: "bg-red-500" },
};

export function InvoicesDueWidget({ data }: { data: DashboardData }) {
  const { fmtCompact } = useCurrency();
  const invoices = data.invoicesDue;
  const totalDue = invoices.reduce((s, inv) => s + (inv.total - inv.paidAmount), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Summary strip */}
      {invoices.length > 0 && (
        <div className="px-4 pt-3 pb-2 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{invoices.length} חשבוניות פתוחות</span>
            <span className="text-sm font-bold text-orange-600">{fmtCompact(totalDue)}</span>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-emerald-400/60" />
          <p className="text-sm text-muted-foreground">אין חשבוניות פתוחות</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-auto">
          {invoices.map((inv) => {
            const balance = inv.total - inv.paidAmount;
            const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.SENT;
            const isOverdue = inv.status === "OVERDUE";

            let dueDateText = "";
            if (inv.dueDate) {
              const d = new Date(inv.dueDate);
              const today = new Date(); today.setHours(0,0,0,0);
              const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
              if (diff < 0)   dueDateText = `${Math.abs(diff)}י׳ פיגור`;
              else if (diff === 0) dueDateText = "היום";
              else if (diff === 1) dueDateText = "מחר";
              else             dueDateText = `${diff} ימים`;
            }

            return (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{inv.client.name}</p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                  <span className={`text-sm font-bold tabular-nums ${isOverdue ? "text-red-600" : "text-foreground"}`}>
                    {fmtCompact(balance)}
                  </span>
                  {dueDateText && (
                    <span className={`flex items-center gap-0.5 text-[11px]
                      ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {dueDateText}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-border/40 px-4 py-2 shrink-0">
        <Link
          href="/finance"
          className="flex items-center justify-end gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          לכל החשבוניות <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
