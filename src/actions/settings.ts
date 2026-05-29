"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { requireRole, ADMIN_ROLES } from "@/lib/auth-utils";

const SETTING_KEYS = [
  // Company identity
  "company_name",
  "company_phone",
  "company_email",
  "company_address",
  "company_vat",
  // Financials
  "vat_rate",
  "default_currency",
  "company_currency",
  "company_measurement_system",
  // Document defaults
  "quote_footer",
  "invoice_footer",
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

export async function getSystemSettings() {
  const rows = await db.systemSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function saveSystemSetting(key: SettingKey, value: string) {
  await requireRole(ADMIN_ROLES);
  await db.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value, description: key.replace("company_", "Company ") },
  });
  revalidatePath("/settings");
  return { success: true as const };
}

/**
 * Returns the active system currency code (ISO 4217).
 * Falls back to `default_currency`, then locale-aware default:
 *   - English locale → "USD"
 *   - Hebrew locale  → "ILS"
 */
export async function getCurrencyCode(): Promise<string> {
  const [rows, locale] = await Promise.all([
    db.systemSetting.findMany({
      where: { key: { in: ["company_currency", "default_currency"] } },
      select: { key: true, value: true },
    }),
    getLocale().catch(() => "he"),
  ]);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  const localeFallback = locale === "en" ? "USD" : "ILS";
  return map.company_currency || map.default_currency || localeFallback;
}

/**
 * Returns the active measurement system setting ("AUTO" | "METRIC" | "IMPERIAL").
 * Falls back to "AUTO" if not set.
 */
export async function getMeasurementSystem(): Promise<string> {
  const rows = await db.systemSetting.findMany({
    where: { key: "company_measurement_system" },
    select: { value: true },
  });
  return rows[0]?.value || "AUTO";
}

export async function saveAllSettings(data: Partial<Record<SettingKey, string>>) {
  await requireRole(ADMIN_ROLES);
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    await db.systemSetting.upsert({
      where:  { key },
      update: { value },
      create: { key, value, description: key },
    });
  }
  revalidatePath("/settings");
  return { success: true as const };
}
