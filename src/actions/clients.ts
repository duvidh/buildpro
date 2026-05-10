"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clientSchema, type ClientInput } from "@/lib/schemas/client-schema";

export async function createClient(raw: ClientInput) {
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { email, ...rest } = parsed.data;
  const client = await db.client.create({
    data: { ...rest, email: email || null },
  });
  revalidatePath("/clients");
  return { success: true as const, clientId: client.id };
}

export async function getClients() {
  return db.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true, invoices: true } },
      projects: { select: { contractValue: true, status: true } },
      invoices: { select: { total: true, paidAmount: true } },
    },
  });
}

export async function updateClient(id: string, raw: ClientInput) {
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { email, ...rest } = parsed.data;
  await db.client.update({
    where: { id },
    data: { ...rest, email: email || null },
  });
  revalidatePath("/clients");
  return { success: true as const };
}

export async function deleteClient(id: string) {
  try {
    await db.client.delete({ where: { id } });
    revalidatePath("/clients");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "לא ניתן למחוק לקוח עם נתונים משויכים (פרויקטים / חשבוניות)" };
  }
}

export async function getClientById(id: string) {
  return db.client.findUnique({
    where: { id },
    include: {
      leads: {
        select: { id: true, name: true, createdAt: true, status: true, source: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          contractValue: true,
          progressPercent: true,
          startDate: true,
          endDate: true,
          address: true,
          createdAt: true,
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          quoteNumber: true,
          date: true,
          validUntil: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          dueDate: true,
          status: true,
          total: true,
          paidAmount: true,
          createdAt: true,
        },
      },
    },
  });
}
