"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const SETTING_KEYS = [
  "company_name",
  "company_phone",
  "company_email",
  "company_address",
  "company_vat",
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
  await db.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value, description: key.replace("company_", "Company ") },
  });
  revalidatePath("/settings");
  return { success: true as const };
}

export async function saveAllSettings(data: Partial<Record<SettingKey, string>>) {
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    await db.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, description: key },
    });
  }
  revalidatePath("/settings");
  return { success: true as const };
}
