"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { requireRole, ADMIN_ROLES } from "@/lib/auth-utils";
import { uploadToStorage, deleteFromStorage } from "@/lib/supabase-storage";
import { getSession } from "@/lib/session";
import { currentCompanyId } from "@/lib/tenant";
import { seedDemoProject } from "@/lib/demo-seed";

const SETTING_KEYS = [
  // Company identity
  "company_name",
  "company_phone",
  "company_email",
  "company_address",
  "company_vat",
  "company_logo",
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
  const cid = await currentCompanyId();
  const rows = await db.systemSetting.findMany({
    where: { companyId: cid, key: { in: [...SETTING_KEYS] } },
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function saveSystemSetting(key: SettingKey, value: string) {
  await requireRole(ADMIN_ROLES);
  const cid = await currentCompanyId();
  if (!cid) return { success: false as const, error: "no_company" as const };
  await db.systemSetting.upsert({
    where: { companyId_key: { companyId: cid, key } },
    update: { value },
    create: { companyId: cid, key, value, description: key.replace("company_", "Company ") },
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
  const cid = await currentCompanyId().catch(() => null);
  const [rows, locale] = await Promise.all([
    db.systemSetting.findMany({
      where: { companyId: cid, key: { in: ["company_currency", "default_currency"] } },
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
  const cid = await currentCompanyId().catch(() => null);
  const rows = await db.systemSetting.findMany({
    where: { companyId: cid, key: "company_measurement_system" },
    select: { value: true },
  });
  return rows[0]?.value || "AUTO";
}

export async function saveAllSettings(data: Partial<Record<SettingKey, string>>) {
  await requireRole(ADMIN_ROLES);
  const cid = await currentCompanyId();
  if (!cid) return { success: false as const, error: "no_company" as const };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    await db.systemSetting.upsert({
      where:  { companyId_key: { companyId: cid, key } },
      update: { value },
      create: { companyId: cid, key, value, description: key },
    });
  }
  revalidatePath("/settings");
  return { success: true as const };
}

/**
 * Upload a company logo to Supabase Storage and persist its public URL
 * under the `company_logo` system setting.
 */
export async function uploadCompanyLogo(formData: FormData) {
  await requireRole(ADMIN_ROLES);

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "invalid_file" as const };
  }
  if (!file.type.startsWith("image/")) {
    return { success: false as const, error: "not_image" as const };
  }

  const storagePath = `company/logo/${Date.now()}-${file.name}`;

  let logoUrl: string;
  try {
    logoUrl = await uploadToStorage(storagePath, file);
  } catch (err) {
    console.error("[uploadCompanyLogo] Supabase storage upload failed:", err);
    return { success: false as const, error: "upload_failed" as const };
  }

  const cid = await currentCompanyId();
  if (!cid) return { success: false as const, error: "no_company" as const };
  await db.systemSetting.upsert({
    where:  { companyId_key: { companyId: cid, key: "company_logo" } },
    update: { value: logoUrl },
    create: { companyId: cid, key: "company_logo", value: logoUrl, description: "Company logo" },
  });

  revalidatePath("/settings");
  return { success: true as const, url: logoUrl };
}

/** Remove the company logo: delete the file from storage and clear the setting. */
export async function removeCompanyLogo() {
  await requireRole(ADMIN_ROLES);
  const cid = await currentCompanyId();
  if (!cid) return { success: false as const, error: "no_company" as const };

  const existing = await db.systemSetting.findUnique({
    where: { companyId_key: { companyId: cid, key: "company_logo" } },
    select: { value: true },
  });

  // Best-effort: remove the stored file (non-fatal if it fails).
  if (existing?.value) {
    try { await deleteFromStorage(existing.value); } catch { /* ignore */ }
  }

  await db.systemSetting.deleteMany({ where: { companyId: cid, key: "company_logo" } });

  revalidatePath("/settings");
  return { success: true as const };
}

export async function injectDemoData() {
  const [session, locale] = await Promise.all([
    getSession(),
    getLocale().catch(() => "he" as const),
  ]);

  if (!session?.companyId || !session?.userId) {
    return { success: false as const, error: "unauthorized" as const };
  }

  try {
    await seedDemoProject(
      session.companyId,
      session.userId,
      (locale === "en" ? "en" : "he") as "en" | "he",
    );
  } catch (err) {
    console.error("[injectDemoData]", err);
    return { success: false as const, error: "seed_failed" as const };
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { success: true as const };
}
