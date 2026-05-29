"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocale } from "next-intl";
import { formatCurrency, formatCurrencyCompact } from "@/lib/formatters";

// ─── Context shape ────────────────────────────────────────────────────────────

export type CurrencyContextValue = {
  /** ISO 4217 currency code stored in system settings, e.g. "ILS", "USD". */
  currencyCode: string;
  /** Full-precision, locale-aware format: "$1,234.50" / "‏1,234.50 ₪" */
  fmtAmount: (amount: number) => string;
  /** Compact K/M format for widgets & charts: "$1.2M", "₪50K" */
  fmtCompact: (amount: number) => string;
};

const defaultCtx: CurrencyContextValue = {
  currencyCode: "ILS",
  fmtAmount:   (n) => formatCurrency(n, "ILS"),
  fmtCompact:  (n) => formatCurrencyCompact(n, "ILS"),
};

const CurrencyContext = createContext<CurrencyContextValue>(defaultCtx);

// ─── Provider (rendered once in AppLayout) ────────────────────────────────────

export function CurrencyProvider({
  currencyCode,
  children,
}: {
  currencyCode: string;
  children: React.ReactNode;
}) {
  const locale     = useLocale();
  const intlLocale = locale === "he" ? "he-IL" : "en-US";

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currencyCode,
      fmtAmount:  (n) => formatCurrency(n, currencyCode, intlLocale),
      fmtCompact: (n) => formatCurrencyCompact(n, currencyCode, intlLocale),
    }),
    [currencyCode, intlLocale],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
