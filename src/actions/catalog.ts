"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { catalogItemSchema, type CatalogItemInput } from "@/lib/schemas/catalog-schema";

export async function getCatalogItems() {
  return db.catalogItem.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createCatalogItem(raw: CatalogItemInput) {
  const parsed = catalogItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { name, unit, unitCost, category, description } = parsed.data;
  await db.catalogItem.create({
    data: {
      name,
      unit,
      unitCost: unitCost ? parseFloat(unitCost) || 0 : 0,
      category: category || null,
      description: description || null,
    },
  });
  revalidatePath("/catalog");
  return { success: true as const };
}

export async function updateCatalogItem(id: string, raw: CatalogItemInput) {
  const parsed = catalogItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { name, unit, unitCost, category, description } = parsed.data;
  await db.catalogItem.update({
    where: { id },
    data: {
      name,
      unit,
      unitCost: unitCost ? parseFloat(unitCost) || 0 : 0,
      category: category || null,
      description: description || null,
    },
  });
  revalidatePath("/catalog");
  return { success: true as const };
}

export async function deleteCatalogItem(id: string) {
  await db.catalogItem.update({ where: { id }, data: { active: false } });
  revalidatePath("/catalog");
  return { success: true as const };
}

export async function seedCatalogItems() {
  const existing = await db.catalogItem.count({ where: { active: true } });
  if (existing > 0) return { success: true as const, skipped: true };

  const items = [
    { name: 'ריצוף גרניט פורצלן 60×60', unit: 'מ"ר', unitCost: 65, category: "ריצוף" },
    { name: 'שיש קרארה — משטח', unit: 'מ"ר', unitCost: 320, category: "גמר" },
    { name: "שעת עבודה — פועל", unit: "שעה", unitCost: 80, category: "עבודה" },
    { name: "שעת עבודה — בנאי מוסמך", unit: "שעה", unitCost: 130, category: "עבודה" },
    { name: 'שק מלט 50 ק"ג', unit: "שק", unitCost: 28, category: "חומרים" },
    { name: 'לבנה טרמית 20 ס"מ', unit: "יח'", unitCost: 3.5, category: "חומרים" },
    { name: "צבע חיצוני ליטר", unit: "ליטר", unitCost: 22, category: "צביעה" },
    { name: 'חלון אלומיניום 1×1.2 מ"ר', unit: "יח'", unitCost: 850, category: "חלונות ודלתות" },
  ];

  for (const item of items) {
    await db.catalogItem.create({ data: item });
  }
  revalidatePath("/catalog");
  return { success: true as const };
}
