import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Formatting utilities shared across the app ──────────────────────────────

export { formatCurrency, formatCurrencyCompact } from "@/lib/formatters";

/** שמות חודשים בעברית קצרים */
export const HE_MONTHS = [
  "ינו׳","פבר׳","מרץ","אפר׳","מאי","יונ׳",
  "יול׳","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳",
] as const;

/**
 * @deprecated Use `useCurrency().fmtCompact()` in client components
 * or `formatCurrencyCompact(amount, code, locale)` in server components.
 * Kept for gradual migration — always formats as ILS / he-IL.
 */
export function fmtShekel(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `₪${(v / 1_000).toFixed(0)}K`;
  return `₪${v.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

/**
 * פורמט תאריך קצר בעברית (dd/mm/yyyy)
 * מחזיר "—" אם null
 */
export function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("he-IL").format(new Date(date));
}

/**
 * פורמט תאריך ושעה מלא בעברית
 */
export function fmtDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
