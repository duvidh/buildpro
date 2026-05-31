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
  const { name, sku, unit, unitCost, category, description } = parsed.data;
  await db.catalogItem.create({
    data: {
      name,
      sku:         sku         || null,
      unit,
      unitCost:    unitCost    ? parseFloat(unitCost) || 0 : 0,
      category:    category    || null,
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
  const { name, sku, unit, unitCost, category, description } = parsed.data;
  await db.catalogItem.update({
    where: { id },
    data: {
      name,
      sku:         sku         || null,
      unit,
      unitCost:    unitCost    ? parseFloat(unitCost) || 0 : 0,
      category:    category    || null,
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

export async function bulkDeleteCatalogItems(ids: string[]) {
  const validIds = ids.filter(Boolean);
  if (validIds.length === 0) return { success: false as const, count: 0 };
  await db.catalogItem.updateMany({
    where: { id: { in: validIds } },
    data: { active: false },
  });
  revalidatePath("/catalog");
  return { success: true as const, count: validIds.length };
}

// ─── Bulk import ──────────────────────────────────────────────────────────────

type ImportRow = {
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  unitCost?: number;
  description?: string;
};

export async function bulkImportCatalogItems(rows: ImportRow[]) {
  const valid = rows.filter((r) => r.name && r.unit);
  if (valid.length === 0) {
    return { success: false as const, error: "לא נמצאו שורות תקינות לייבוא" };
  }
  await db.catalogItem.createMany({
    data: valid.map((r) => ({
      name:        r.name.trim(),
      sku:         r.sku?.trim()         || null,
      category:    r.category?.trim()    || null,
      unit:        r.unit.trim(),
      unitCost:    r.unitCost            ?? 0,
      description: r.description?.trim() || null,
    })),
    skipDuplicates: false,
  });
  revalidatePath("/catalog");
  return { success: true as const, count: valid.length };
}

// ─── Seed demo data ───────────────────────────────────────────────────────────

export async function seedCatalogItems() {
  const existing = await db.catalogItem.count({ where: { active: true } });
  if (existing > 0) return { success: true as const, skipped: true };

  const items = [
    { name: 'ריצוף גרניט פורצלן 60×60', sku: "FLR-GRN-6060", unit: 'מ"ר', unitCost: 65,  category: "ריצוף" },
    { name: 'שיש קרארה — משטח',          sku: "FIN-MRB-KAR",  unit: 'מ"ר', unitCost: 320, category: "גמר" },
    { name: "שעת עבודה — פועל",           sku: "LAB-WRK-001",  unit: "שעה", unitCost: 80,  category: "עבודה" },
    { name: "שעת עבודה — בנאי מוסמך",    sku: "LAB-SKL-001",  unit: "שעה", unitCost: 130, category: "עבודה" },
    { name: 'שק מלט 50 ק"ג',             sku: "MAT-CMT-050",  unit: "שק",  unitCost: 28,  category: "חומרים" },
    { name: 'לבנה טרמית 20 ס"מ',         sku: "MAT-BRK-020",  unit: "יח'", unitCost: 3.5, category: "חומרים" },
    { name: "צבע חיצוני ליטר",            sku: "PNT-EXT-001",  unit: "ליטר",unitCost: 22,  category: "צביעה" },
    { name: 'חלון אלומיניום 1×1.2 מ"ר',  sku: "WIN-ALU-120",  unit: "יח'", unitCost: 850, category: "חלונות ודלתות" },
  ];

  for (const item of items) {
    await db.catalogItem.create({ data: item });
  }
  revalidatePath("/catalog");
  return { success: true as const };
}
