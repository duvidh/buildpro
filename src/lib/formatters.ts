/**
 * Currency and measurement formatting utilities.
 * Use `formatCurrency` for full-precision Intl output.
 * Use `formatCurrencyCompact` for K/M abbreviations in charts and widgets.
 * Use `getMeasurementUnits` for locale/system-aware unit labels.
 */

// ─── Supported currencies ─────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = [
  { code: "ILS", symbol: "₪",   nameHe: "שקל ישראלי",   nameEn: "Israeli Shekel"    },
  { code: "USD", symbol: "$",   nameHe: "דולר אמריקאי",  nameEn: "US Dollar"         },
  { code: "EUR", symbol: "€",   nameHe: "אירו",           nameEn: "Euro"              },
  { code: "GBP", symbol: "£",   nameHe: "פאונד בריטי",   nameEn: "British Pound"     },
  { code: "CAD", symbol: "CA$", nameHe: "דולר קנדי",      nameEn: "Canadian Dollar"   },
  { code: "AUD", symbol: "A$",  nameHe: "דולר אוסטרלי",  nameEn: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", nameHe: "פרנק שוויצרי",  nameEn: "Swiss Franc"       },
  { code: "JPY", symbol: "¥",   nameHe: "ין יפני",        nameEn: "Japanese Yen"      },
  { code: "CNY", symbol: "¥",   nameHe: "יואן סיני",      nameEn: "Chinese Yuan"      },
  { code: "RUB", symbol: "₽",   nameHe: "רובל רוסי",      nameEn: "Russian Ruble"     },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"];

/** Look up the short symbol for a currency code (e.g. "ILS" → "₪"). */
export function currencySymbol(code: string): string {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Full-precision, locale-aware currency format via `Intl.NumberFormat`.
 * Handles symbol placement (RTL/LTR), decimal digits, and grouping separators.
 *
 * @example formatCurrency(1234.5, "USD", "en-US")  →  "$1,234.50"
 * @example formatCurrency(1234.5, "ILS", "he-IL")  →  "‏1,234.50 ₪"
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale = "he-IL",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

// ─── Measurement system ───────────────────────────────────────────────────────

/** The three possible values stored in `company_measurement_system`. */
export type MeasurementSystem = "AUTO" | "METRIC" | "IMPERIAL";

export interface MeasurementUnits {
  /** Short area unit label, e.g. "מ״ר" or "sq ft" */
  area: string;
  /** Short length unit label, e.g. "מ׳" or "ft" */
  length: string;
}

/**
 * Resolves the effective measurement units given a system setting and the
 * active locale.  Safe to call from both server components and utility code.
 *
 * @param system  Value stored in DB (AUTO | METRIC | IMPERIAL).  Defaults to AUTO.
 * @param locale  Active next-intl locale ("he" | "en").  Defaults to "he".
 */
export function getMeasurementUnits(
  system: MeasurementSystem | string | null | undefined,
  locale = "he",
): MeasurementUnits {
  const resolved: "METRIC" | "IMPERIAL" =
    system === "METRIC"   ? "METRIC"
    : system === "IMPERIAL" ? "IMPERIAL"
    : locale === "en"       ? "IMPERIAL"   // AUTO: English → Imperial
    : "METRIC";                             // AUTO: Hebrew  → Metric

  if (resolved === "IMPERIAL") {
    return { area: "sq ft", length: "ft" };
  }
  return { area: 'מ״ר', length: "מ׳" };
}

// ─── Currency formatters ──────────────────────────────────────────────────────

/**
 * Compact currency format: K (thousands) / M (millions) suffixes.
 * Falls back to `formatCurrency` for amounts below 1 000.
 * Suitable for charts, dashboard KPIs, and list cells.
 *
 * @example formatCurrencyCompact(1_500_000, "USD")  →  "$1.5M"
 * @example formatCurrencyCompact(3_000,     "ILS")  →  "₪3K"
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string,
  locale = "he-IL",
): string {
  const symbol = currencySymbol(currencyCode);
  const abs    = Math.abs(amount);
  const sign   = amount < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${symbol}${Math.round(abs / 1_000)}K`;
  return formatCurrency(amount, currencyCode, locale);
}
