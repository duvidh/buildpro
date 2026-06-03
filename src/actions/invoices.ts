"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, FINANCE_WRITE_ROLES } from "@/lib/auth-utils";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { currentCompanyId } from "@/lib/tenant";

// ─── Fetch a single invoice (tenant-scoped) ──────────────────────────────────

export async function getInvoiceById(id: string) {
  const cid = await currentCompanyId();
  return db.invoice.findFirst({
    // Scope by company so one tenant can't open another's invoice by id.
    where: { id, companyId: cid },
    select: {
      id: true,
      invoiceNumber: true,
      description: true,
      date: true,
      dueDate: true,
      status: true,
      amount: true,
      taxPercent: true,
      taxAmount: true,
      total: true,
      paidAmount: true,
      notes: true,
      client:  { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      payments: {
        orderBy: { date: "desc" },
        select: { id: true, date: true, amount: true, method: true, reference: true },
      },
    },
  });
}

// ─── Auto-generate next invoice number ───────────────────────────────────────

async function nextInvoiceNumber(cid: string | null): Promise<string> {
  const last = await db.invoice.findFirst({
    where:   { companyId: cid },
    orderBy: { createdAt: "desc" },
    select:  { invoiceNumber: true },
  });
  if (!last?.invoiceNumber) return "INV-0001";
  const match = last.invoiceNumber.match(/(\d+)$/);
  const next  = match ? parseInt(match[1]) + 1 : 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

// ─── Create Invoice ───────────────────────────────────────────────────────────

export async function createInvoice(data: {
  clientId:      string;
  projectId:     string;
  invoiceNumber?: string;
  description?:  string;
  date:          string;
  dueDate?:      string;
  amount:        number;
  taxPercent:    number;
  notes?:        string;
}) {
  try { await requireRole(FINANCE_WRITE_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  if (!data.clientId || !data.projectId) {
    return { success: false as const, error: "חסר לקוח או פרויקט" };
  }
  if (!data.amount || data.amount <= 0) {
    return { success: false as const, error: "סכום חייב להיות גדול מ-0" };
  }

  const session      = await getSession();
  const actorId      = session?.userId ?? null;
  const actorName    = session?.name   ?? "מישהו";
  const cid          = await currentCompanyId();
  const taxAmount    = Math.round(data.amount * (data.taxPercent / 100) * 100) / 100;
  const total        = Math.round((data.amount + taxAmount) * 100) / 100;
  const invoiceNumber = data.invoiceNumber?.trim() || await nextInvoiceNumber(cid);

  let invoice;
  try {
    invoice = await db.invoice.create({
      data: {
        companyId:     cid,
        clientId:      data.clientId,
        projectId:     data.projectId,
        invoiceNumber,
        description:   data.description?.trim() || null,
        date:          new Date(data.date),
        dueDate:       data.dueDate ? new Date(data.dueDate) : null,
        amount:        data.amount,
        taxPercent:    data.taxPercent,
        taxAmount,
        total,
        notes:         data.notes || null,
        status:        "DRAFT",
      },
    });
  } catch (e: unknown) {
    const isPrismaUniqueViolation =
      typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
    if (isPrismaUniqueViolation) {
      return { success: false as const, error: `מספר חשבונית ${invoiceNumber} כבר קיים` };
    }
    throw e;
  }

  await logActivity({
    userId:      actorId,
    action:      "INVOICE_CREATED",
    entityType:  "INVOICE",
    entityId:    invoice.id,
    projectId:   data.projectId,
    description: `${actorName} יצר חשבונית #${invoiceNumber} — ₪${total.toLocaleString("he-IL")}`,
  });

  revalidatePath(`/clients/${data.clientId}/invoices`);
  revalidatePath(`/projects/${data.projectId}/financials`);
  revalidatePath("/finance");

  return { success: true as const, invoiceId: invoice.id };
}
