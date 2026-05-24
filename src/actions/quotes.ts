"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { type CreateQuoteInput, type UpdateQuoteHeaderInput } from "@/lib/schemas/quote-schema";
import type { QuoteStatusValue } from "@/lib/constants/quote-enums";

export async function getQuotes() {
  return db.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getQuoteById(id: string) {
  return db.quote.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      items: {
        orderBy: { order: "asc" },
        include: {
          catalogItem: { select: { id: true, name: true, unit: true, unitCost: true } },
        },
      },
    },
  });
}

async function generateQuoteNumber(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q${year}-`;
  // Use MAX on the numeric suffix instead of COUNT — survives deletions and is deterministic
  const last = await tx.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });
  const lastNum = last?.quoteNumber ? parseInt(last.quoteNumber.slice(prefix.length), 10) : 0;
  return `${prefix}${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(4, "0")}`;
}

export async function createQuote(data: CreateQuoteInput) {
  // Generate number and create inside one transaction so concurrent calls
  // hit the unique constraint rather than producing duplicate numbers.
  const quote = await db.$transaction(async (tx) => {
    const quoteNumber = await generateQuoteNumber(tx);
    return tx.quote.create({
      data: {
        clientId: data.clientId || null,
        leadId: data.leadId || null,
        projectId: data.projectId || null,
        quoteNumber,
        date: new Date(),
        status: "DRAFT",
        taxPercent: 17,
      },
    });
  });
  revalidatePath("/quotes");
  return { success: true as const, quoteId: quote.id };
}

export async function updateQuoteHeader(id: string, data: UpdateQuoteHeaderInput) {
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

export async function addQuoteItem(quoteId: string) {
  const last = await db.quoteItem.findFirst({
    where: { quoteId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const item = await db.quoteItem.create({
    data: { quoteId, name: "", unit: "יח'", order: (last?.order ?? -1) + 1 },
  });
  revalidatePath(`/quotes/${quoteId}`);
  return { success: true as const, item };
}

export async function deleteQuoteItem(id: string) {
  const item = await db.quoteItem.delete({ where: { id } });
  revalidatePath(`/quotes/${item.quoteId}`);
  return { success: true as const };
}

type ItemSaveData = {
  id: string;
  catalogItemId: string | null;
  name: string;
  unit: string;
  dim1: number;
  dim2: number | null;
  quantity: number;
  unitPrice: number;
  profitPercent: number;
  linePrice: number;
  order: number;
};

export async function saveQuoteItems(quoteId: string, items: ItemSaveData[]) {
  // Read the quote's taxPercent from DB instead of hardcoding
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: { taxPercent: true },
  });
  const taxPercent = quote?.taxPercent ?? 17;

  const subtotal = Math.round(items.reduce((s, i) => s + i.linePrice, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  await db.$transaction(async (tx) => {
    for (const item of items) {
      await tx.quoteItem.update({
        where: { id: item.id },
        data: {
          catalogItemId: item.catalogItemId,
          name: item.name,
          unit: item.unit,
          dim1: item.dim1 || null,
          dim2: item.dim2,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          profitPercent: item.profitPercent,
          linePrice: item.linePrice,
          order: item.order,
        },
      });
    }
    await tx.quote.update({
      where: { id: quoteId },
      data: { subtotal, taxAmount, total },
    });
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  return { success: true as const, subtotal, taxAmount, total };
}

export async function updateQuoteStatus(id: string, status: QuoteStatusValue) {
  await db.quote.update({ where: { id }, data: { status } });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { success: true as const };
}

export async function deleteQuote(id: string) {
  await db.quote.delete({ where: { id } });
  revalidatePath("/quotes");
  return { success: true as const };
}
