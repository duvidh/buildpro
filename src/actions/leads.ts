"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { LeadStatusValue } from "@/lib/constants/lead-enums";
import { createLeadSchema, type CreateLeadInput } from "@/lib/schemas/lead-schema";

export async function getLeads() {
  return db.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
      assignedEmployee: { select: { id: true, name: true } },
    },
  });
}

export async function createLead(raw: CreateLeadInput) {
  const parsed = createLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }

  const { budget, estimatedSize, email, assignedEmployeeId, constructionTypes, ...rest } = parsed.data;
  const budgetNum = budget ? parseFloat(budget.replace(/,/g, "")) : null;
  const sizeNum = estimatedSize ? parseFloat(estimatedSize) : null;

  await db.lead.create({
    data: {
      ...rest,
      email: email || null,
      budget: budgetNum && !isNaN(budgetNum) ? budgetNum : null,
      estimatedSize: sizeNum && !isNaN(sizeNum) ? sizeNum : null,
      constructionTypes: constructionTypes ?? [],
      assignedEmployeeId: assignedEmployeeId || null,
    },
  });

  revalidatePath("/leads");
  return { success: true as const };
}

export async function updateLead(id: string, raw: CreateLeadInput) {
  const parsed = createLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }
  const { budget, estimatedSize, email, assignedEmployeeId, constructionTypes, ...rest } = parsed.data;
  const budgetNum = budget ? parseFloat(budget.replace(/,/g, "")) : null;
  const sizeNum = estimatedSize ? parseFloat(estimatedSize) : null;
  await db.lead.update({
    where: { id },
    data: {
      ...rest,
      email: email || null,
      budget: budgetNum && !isNaN(budgetNum) ? budgetNum : null,
      estimatedSize: sizeNum && !isNaN(sizeNum) ? sizeNum : null,
      constructionTypes: constructionTypes ?? [],
      assignedEmployeeId: assignedEmployeeId || null,
    },
  });
  revalidatePath("/leads");
  return { success: true as const };
}

export async function deleteLead(id: string) {
  try {
    await db.lead.delete({ where: { id } });
    revalidatePath("/leads");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "לא ניתן למחוק את הליד" };
  }
}

export async function updateLeadStatus(id: string, status: LeadStatusValue) {
  try {
    await db.lead.update({ where: { id }, data: { status } });
    revalidatePath("/leads");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "לא ניתן לעדכן את סטטוס הליד." };
  }
}

export async function getLeadsForSelect() {
  return db.lead.findMany({
    where: { status: { not: "CONVERTED" } },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function convertLeadToClient(leadId: string) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });

  if (!lead) {
    return { success: false as const, error: "ליד לא נמצא" };
  }
  if (lead.status === "CONVERTED" || lead.convertedToId) {
    return { success: false as const, error: "ליד זה כבר הומר ללקוח" };
  }

  const client = await db.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        phone2: lead.phone2 ?? undefined,
        email: lead.email ?? undefined,
        address: lead.propertyAddress ?? undefined,
        notes: lead.notes ?? undefined,
      },
    });

    await tx.lead.update({
      where: { id: leadId },
      data: {
        status: "CONVERTED",
        convertedAt: new Date(),
        convertedToId: newClient.id,
      },
    });

    return newClient;
  });

  revalidatePath("/leads");
  revalidatePath("/clients");
  return { success: true as const, clientId: client.id };
}
