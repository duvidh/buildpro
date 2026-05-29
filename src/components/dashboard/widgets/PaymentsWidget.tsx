"use client";

import Link from "next/link";
import { useCurrency } from "@/lib/currency-context";
import { CreditCard, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "./types";

const METHOD_CFG: Record<string, { label: string; className: string }> = {
  BANK_TRANSFER: { label: "העברה",  className: "bg-blue-50 text-blue-700 border-blue-200" },
  CHECK:         { label: "צ׳ק",    className: "bg-violet-50 text-violet-700 border-violet-200" },
  CASH:          { label: "מזומן",  className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CREDIT_CARD:   { label: "אשראי",  className: "bg-orange-50 text-orange-700 border-orange-200" },
  OTHER:         { label: "אחר",    className: "bg-gray-50 text-gray-600 border-gray-200" },
};

export function PaymentsWidget({ data }: { data: DashboardData }) {
  const { fmtCompact } = useCurrency();
  const { recentPayments } = data;

  return (
    <div className="flex flex-col h-full">
      {recentPayments.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground p-4">
          אין תשלומים שנרשמו עדיין
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-auto">
          {recentPayments.map((payment) => {
            const method = METHOD_CFG[payment.method] ?? METHOD_CFG.OTHER;
            const dateText = new Intl.DateTimeFormat("he-IL", {
              day: "2-digit", month: "2-digit", year: "2-digit",
            }).format(new Date(payment.date));
            return (
              <li key={payment.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{payment.invoice.client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{payment.invoice.project.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-semibold text-emerald-600">
                    {fmtCompact(payment.amount)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${method.className}`}>
                      {method.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{dateText}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-border/40 px-4 py-2 shrink-0">
        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground w-full justify-end">
          <Link href="/finance">
            לכספים <ChevronLeft className="h-3.5 w-3.5 ms-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
