"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { type CreateQuoteInput, type UpdateQuoteHeaderInput } from "@/lib/schemas/quote-schema";
import type { QuoteStatusValue } from "@/lib/constants/quote-enums";
import { requireRole, PROJECT_ROLES, DELETE_ROLES } from "@/lib/auth-utils";
import { currentCompanyId } from "@/lib/tenant";

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getQuotes() {
  const cid = await currentCompanyId();
  return db.quote.findMany({
    where: { companyId: cid },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getQuoteById(id: string) {
  const cid = await currentCompanyId();
  return db.quote.findFirst({
    where: { id, companyId: cid },
    include: {
      client: { select: { id: true, name: true } },
      lead:   { select: { id: true, name: true } },
      categories: {
        orderBy: { order: "asc" },
      },
      items: {
        orderBy: { order: "asc" },
        include: {
          catalogItem: { select: { id: true, name: true, unit: true, unitCost: true } },
        },
      },
    },
  });
}

// ─── Quote CRUD ───────────────────────────────────────────────────────────────

async function generateQuoteNumber(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  cid: string | null,
): Promise<string> {
  const year   = new Date().getFullYear();
  const prefix = `Q${year}-`;
  const last   = await tx.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix }, companyId: cid },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });
  const lastNum = last?.quoteNumber ? parseInt(last.quoteNumber.slice(prefix.length), 10) : 0;
  return `${prefix}${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(4, "0")}`;
}

export async function createQuote(data: CreateQuoteInput) {
  await requireRole(PROJECT_ROLES);
  const cid = await currentCompanyId();
  const quote = await db.$transaction(async (tx) => {
    const quoteNumber = await generateQuoteNumber(tx, cid);
    return tx.quote.create({
      data: {
        companyId: cid,
        clientId:  data.clientId  || null,
        leadId:    data.leadId    || null,
        projectId: data.projectId || null,
        quoteNumber,
        date:       new Date(),
        status:     "DRAFT",
        taxPercent: 17,
      },
    });
  });
  revalidatePath("/quotes");
  return { success: true as const, quoteId: quote.id };
}

export async function updateQuoteHeader(id: string, data: UpdateQuoteHeaderInput) {
  await requireRole(PROJECT_ROLES);
  const cid = await currentCompanyId();
  const owned = await db.quote.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const };
  await db.quote.update({
    where: { id },
    data: {
      ...(data.clientId && { clientId: data.clientId }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.validUntil !== undefined && {
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });
  revalidatePath(`/quotes/${id}`);
  return { success: true as const };
}

export async function updateQuoteStatus(id: string, status: QuoteStatusValue) {
  await requireRole(PROJECT_ROLES);
  const cid = await currentCompanyId();
  const owned = await db.quote.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const };
  await db.quote.update({ where: { id }, data: { status } });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { success: true as const };
}

export async function deleteQuote(id: string) {
  await requireRole(DELETE_ROLES);
  const cid = await currentCompanyId();
  const owned = await db.quote.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const };
  await db.quote.delete({ where: { id } });
  revalidatePath("/quotes");
  return { success: true as const };
}

// ─── Category (Chapter) CRUD ──────────────────────────────────────────────────

export async function createQuoteCategory(quoteId: string, name: string) {
  await requireRole(PROJECT_ROLES);
  const cid = await currentCompanyId();
  const owned = await db.quote.findFirst({ where: { id: quoteId, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const, category: null };
  const last = await db.quoteCategory.findFirst({
    where: { quoteId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const category = await db.quoteCategory.create({
    data: { quoteId, name, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath(`/quotes/${quoteId}`);
  return { success: true as const, category };
}

export async function updateQuoteCategory(id: string, name: string) {
  await requireRole(PROJECT_ROLES);
  const cid = await currentCompanyId();
  const cat = await db.quoteCategory.findFirst({
    where: { id, quote: { companyId: cid } },
    select: { quoteId: true },
  });
  if (!cat) return { success: false as const };
  await db.quoteCategory.update({ where: { id }, data: { name } });
  revalidatePath(`/quotes/${cat.quoteId}`);
  return { success: true as const };
}

export async function deleteQuoteCategory(id: string) {
  await requireRole(DELETE_ROLES);
  const cid = await currentCompanyId();
  const cat = await db.quoteCategory.findFirst({
    where: { id, quote: { companyId: cid } },
    select: { quoteId: true },
  });
  if (!cat) return { success: false as const };
  // Items become uncategorized (categoryId → null) due to SetNull on the relation
  await db.quoteCategory.delete({ where: { id } });
  revalidatePath(`/quotes/${cat.quoteId}`);
  return { success: true as const };
}

// ─── Item CRUD ────────────────────────────────────────────────────────────────

export async function addQuoteItem(quoteId: string, categoryId?: string | null) {
  await requireRole(PROJECT_ROLES);
  const cid = await currentCompanyId();
  const owned = await db.quote.findFirst({ where: { id: quoteId, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const, item: null };
  const last = await db.quoteItem.findFirst({
    where: { quoteId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const item = await db.quoteItem.create({
    data: {
      quoteId,
      categoryId: categoryId ?? null,
      name: "",
      unit: "יח'",
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath(`/quotes/${quoteId}`);
  return { success: true as const, item };
}

export async function deleteQuoteItem(id: string) {
  await requireRole(DELETE_ROLES);
  const cid = await currentCompanyId();
  const item = await db.quoteItem.findFirst({
    where: { id, quote: { companyId: cid } },
    select: { quoteId: true },
  });
  if (!item) return { success: false as const };
  await db.quoteItem.delete({ where: { id } });
  revalidatePath(`/quotes/${item.quoteId}`);
  return { success: true as const };
}

type ItemSaveData = {
  id: string;
  categoryId: string | null;
  catalogItemId: string | null;
  name: string;
  unit: string;
  dim1: number;
  dim2: number | null;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  profitPercent: number;
  linePrice: number;
  order: number;
};

export async function saveQuoteItems(
  quoteId: string,
  items: ItemSaveData[],
  contingencyPercent: number,
) {
  await requireRole(PROJECT_ROLES);
  const cid = await currentCompanyId();
  const quote = await db.quote.findFirst({
    where: { id: quoteId, companyId: cid },
    select: { taxPercent: true },
  });
  if (!quote) return { success: false as const };
  const taxPercent = quote.taxPercent ?? 17;

  const subtotal       = Math.round(items.reduce((s, i) => s + i.linePrice, 0) * 100) / 100;
  const contingencyAmt = Math.round(subtotal * (contingencyPercent / 100) * 100) / 100;
  const totalBeforeVat = subtotal + contingencyAmt;
  const taxAmount      = Math.round(totalBeforeVat * (taxPercent / 100) * 100) / 100;
  const total          = Math.round((totalBeforeVat + taxAmount) * 100) / 100;

  await db.$transaction(async (tx) => {
    for (const item of items) {
      // updateMany so the filter can pin the item to this quote — blocks
      // cross-quote item IDs smuggled into the payload.
      await tx.quoteItem.updateMany({
        where: { id: item.id, quoteId },
        data: {
          categoryId:    item.categoryId,
          catalogItemId: item.catalogItemId,
          name:          item.name,
          unit:          item.unit,
          dim1:          item.dim1 || null,
          dim2:          item.dim2,
          quantity:      item.quantity,
          unitPrice:     item.unitPrice,
          costPrice:     item.costPrice,
          profitPercent: item.profitPercent,
          linePrice:     item.linePrice,
          order:         item.order,
        },
      });
    }
    await tx.quote.update({
      where: { id: quoteId },
      data: { subtotal, contingencyPercent, taxAmount, total },
    });
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  return { success: true as const, subtotal, contingencyPercent, taxAmount, total };
}
