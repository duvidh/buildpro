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

// ─── Generate Progress Invoice from Milestones ────────────────────────────────

export async function generateMilestoneInvoice(
  projectId: string,
  milestoneIds: string[],
) {
  try { await requireRole(FINANCE_WRITE_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  if (!milestoneIds.length) {
    return { success: false as const, error: "יש לבחור לפחות אבן דרך אחת" };
  }

  const cid = await currentCompanyId();

  const project = await db.project.findFirst({
    where: { id: projectId, companyId: cid },
    select: {
      id: true,
      clientId: true,
      contractValue: true,
      milestones: { select: { id: true, weight: true, invoiceId: true, name: true } },
    },
  });

  if (!project) return { success: false as const, error: "פרויקט לא נמצא" };
  if (!project.contractValue || project.contractValue <= 0) {
    return { success: false as const, error: "ערך חוזה לא מוגדר לפרויקט" };
  }

  const selectedMilestones = project.milestones.filter((m) =>
    milestoneIds.includes(m.id),
  );

  if (selectedMilestones.some((m) => m.invoiceId)) {
    return { success: false as const, error: "חלק מאבני הדרך כבר קושרו לחשבונית" };
  }

  const totalWeight  = project.milestones.reduce((s, m) => s + m.weight, 0);
  const selectedWeight = selectedMilestones.reduce((s, m) => s + m.weight, 0);
  const proportion   = totalWeight > 0 ? selectedWeight / totalWeight : 0;
  const amount       = Math.round(project.contractValue * proportion * 100) / 100;

  if (amount <= 0) return { success: false as const, error: "הסכום המחושב הוא 0 — בדוק ערכי משקל" };

  const description  = `חשבון עסקה - ${selectedMilestones.map((m) => m.name).join(", ")}`;
  const today        = new Date();
  const dueDate      = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);

  const session    = await getSession();
  const actorId    = session?.userId ?? null;
  const actorName  = session?.name   ?? "מישהו";
  const taxPercent = 17;
  const taxAmount  = Math.round(amount * (taxPercent / 100) * 100) / 100;
  const total      = Math.round((amount + taxAmount) * 100) / 100;
  const invoiceNumber = await nextInvoiceNumber(cid);

  let invoice;
  try {
    invoice = await db.invoice.create({
      data: {
        companyId: cid,
        clientId:  project.clientId,
        projectId,
        invoiceNumber,
        description,
        date:       today,
        dueDate,
        amount,
        taxPercent,
        taxAmount,
        total,
        status: "DRAFT",
      },
    });
  } catch (e: unknown) {
    const isPrismaUniqueViolation =
      typeof e === "object" && e !== null && "code" in e &&
      (e as { code: string }).code === "P2002";
    if (isPrismaUniqueViolation) {
      return { success: false as const, error: `מספר חשבונית ${invoiceNumber} כבר קיים` };
    }
    throw e;
  }

  await db.milestone.updateMany({
    where: { id: { in: milestoneIds } },
    data:  { invoiceId: invoice.id },
  });

  await logActivity({
    userId:      actorId,
    action:      "INVOICE_CREATED",
    entityType:  "INVOICE",
    entityId:    invoice.id,
    projectId,
    description: `${actorName} יצר חשבון עסקה #${invoiceNumber} מאבני דרך — ₪${total.toLocaleString("he-IL")}`,
  });

  revalidatePath(`/projects/${projectId}/milestones`);
  revalidatePath(`/projects/${projectId}/financials`);
  revalidatePath(`/clients/${project.clientId}/invoices`);
  revalidatePath("/finance");

  return { success: true as const, invoiceId: invoice.id };
}
