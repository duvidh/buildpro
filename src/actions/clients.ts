"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clientSchema, type ClientInput } from "@/lib/schemas/client-schema";
import {
  requireRole, CLIENT_ROLES, DELETE_ROLES, QUOTE_ROLES, FINANCE_VIEW_ROLES,
} from "@/lib/auth-utils";
import { currentCompanyId } from "@/lib/tenant";

export async function createClient(raw: ClientInput) {
  try { await requireRole(CLIENT_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { email, latitude, longitude, ...rest } = parsed.data;
  const cid = await currentCompanyId();
  const client = await db.client.create({
    data: {
      ...rest,
      companyId: cid,
      email: email || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });
  revalidatePath("/clients");
  return { success: true as const, clientId: client.id };
}

export async function getClients() {
  const cid = await currentCompanyId();
  return db.client.findMany({
    where: { companyId: cid },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true, invoices: true } },
      projects: { select: { contractValue: true, status: true } },
      invoices: { select: { total: true, paidAmount: true } },
    },
  });
}

export async function updateClient(id: string, raw: ClientInput) {
  try { await requireRole(CLIENT_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { email, latitude, longitude, ...rest } = parsed.data;
  const cid = await currentCompanyId();
  const owned = await db.client.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const, error: "אין הרשאה לבצע פעולה זו" };
  await db.client.update({
    where: { id },
    data: {
      ...rest,
      email: email || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true as const };
}

export async function deleteClient(id: string) {
  try { await requireRole(DELETE_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  const cid = await currentCompanyId();
  const owned = await db.client.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const, error: "אין הרשאה לבצע פעולה זו" };

  try {
    // All child relations (Projects, Invoices, Quotes, Tasks, Files, etc.)
    // have onDelete: Cascade / SetNull in the schema — one delete is enough.
    await db.client.delete({ where: { id } });
    revalidatePath("/clients");
    revalidatePath("/projects");
    revalidatePath("/finance");
    return { success: true as const };
  } catch (e) {
    console.error("deleteClient error:", e);
    return { success: false as const, error: "שגיאה במחיקת הלקוח" };
  }
}

// ─── Focused per-page queries ─────────────────────────────────────────────────

/** Lean query for the layout sticky header (deduped across layout+page). */
export const getClientHeader = cache(async (id: string) => {
  const cid = await currentCompanyId();
  return db.client.findFirst({
    where: { id, companyId: cid },
    select: {
      id: true,
      name: true,
      contactName: true,
      phone: true,
      phone2: true,
      email: true,
      address: true,
      latitude: true,
      longitude: true,
      companyNumber: true,
      notes: true,
      _count: { select: { projects: true, quotes: true, invoices: true } },
    },
  });
});

/** Financial KPIs for the overview tab. */
export async function getClientOverview(id: string) {
  const cid = await currentCompanyId();
  const data = await db.client.findFirst({
    where: { id, companyId: cid },
    select: {
      projects: { select: { contractValue: true } },
      invoices: { select: { total: true, paidAmount: true } },
    },
  });
  if (!data) return null;
  const totalContractValue = data.projects.reduce((s, p) => s + p.contractValue, 0);
  const totalInvoiced = data.invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = data.invoices.reduce((s, i) => s + i.paidAmount, 0);
  return {
    totalContractValue,
    totalInvoiced,
    totalPaid,
    openBalance: totalInvoiced - totalPaid,
  };
}

/** Projects list for the /projects tab. */
export async function getClientProjects(id: string) {
  const cid = await currentCompanyId();
  return db.project.findMany({
    where: { clientId: id, companyId: cid },
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
    },
  });
}

/** Quotes list for the /quotes tab. */
export async function getClientQuotes(id: string) {
  await requireRole(QUOTE_ROLES); // throws "Unauthorized access" for field-level roles
  const cid = await currentCompanyId();
  return db.quote.findMany({
    where: { clientId: id, companyId: cid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quoteNumber: true,
      date: true,
      validUntil: true,
      status: true,
      total: true,
    },
  });
}

/** Invoices list for the /invoices tab. */
export async function getClientInvoices(id: string) {
  await requireRole(FINANCE_VIEW_ROLES); // throws "Unauthorized access" for FIELD_WORKER / SALES
  const cid = await currentCompanyId();
  return db.invoice.findMany({
    where: { clientId: id, companyId: cid },
    orderBy: { date: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      description: true,
      date: true,
      dueDate: true,
      status: true,
      total: true,
      paidAmount: true,
      project: { select: { id: true, name: true } },
    },
  });
}

// Keep legacy full fetch for any code that still needs it
export async function getClientById(id: string) {
  const cid = await currentCompanyId();
  return db.client.findFirst({
    where: { id, companyId: cid },
    include: {
      leads: {
        select: { id: true, name: true, createdAt: true, status: true, source: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, status: true, contractValue: true,
          progressPercent: true, startDate: true, endDate: true,
          address: true, createdAt: true,
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, quoteNumber: true, date: true, validUntil: true,
          status: true, total: true, createdAt: true,
        },
      },
      invoices: {
        orderBy: { date: "desc" },
        select: {
          id: true, invoiceNumber: true, date: true, dueDate: true,
          status: true, total: true, paidAmount: true, createdAt: true,
        },
      },
    },
  });
}
