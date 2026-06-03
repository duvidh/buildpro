"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PaymentMethod, InvoiceStatus } from "@/generated/prisma/client";
import { requireRole, FINANCE_WRITE_ROLES } from "@/lib/auth-utils";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { currentCompanyId } from "@/lib/tenant";

// ─── Client Invoice Payments ───────────────────────────────────────────────────

export async function recordPayment(
  invoiceId: string,
  data: { amount: number; method: string; date: string; reference?: string }
) {
  await requireRole(FINANCE_WRITE_ROLES);

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { total: true, paidAmount: true, status: true, projectId: true, clientId: true, invoiceNumber: true },
  });
  if (!invoice) return { success: false as const, error: "חשבונית לא נמצאה" };
  if (invoice.status === InvoiceStatus.PAID) return { success: false as const, error: "החשבונית כבר שולמה במלואה" };

  const newPaid   = Math.round((invoice.paidAmount + data.amount) * 100) / 100;
  const newStatus: InvoiceStatus = newPaid >= invoice.total ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

  const session   = await getSession();
  const actorId   = session?.userId ?? null;
  const actorName = session?.name   ?? "מישהו";

  await db.$transaction([
    db.payment.create({
      data: {
        invoiceId,
        date:      new Date(data.date),
        amount:    data.amount,
        method:    data.method as PaymentMethod,
        reference: data.reference || null,
      },
    }),
    db.invoice.update({
      where: { id: invoiceId },
      data:  { paidAmount: newPaid, status: newStatus },
    }),
  ]);

  await logActivity({
    userId:      actorId,
    action:      "PAYMENT_RECEIVED",
    entityType:  "INVOICE",
    entityId:    invoiceId,
    projectId:   invoice.projectId ?? null,
    description: `${actorName} רשם תקבול ₪${data.amount.toLocaleString("he-IL")} לחשבונית #${invoice.invoiceNumber}`,
  });

  if (invoice.projectId) revalidatePath(`/projects/${invoice.projectId}`);
  revalidatePath("/finance");
  revalidatePath("/clients");
  return { success: true as const };
}

// ─── Supplier / Contract Payments ─────────────────────────────────────────────

export async function recordSupplierPayment(
  contractId: string,
  data: { amount: number; date: string; reference?: string; notes?: string }
) {
  await requireRole(FINANCE_WRITE_ROLES);

  const contract = await db.contract.findUnique({
    where:  { id: contractId },
    select: { value: true, paidAmount: true, projectId: true, supplier: { select: { name: true } } },
  });
  if (!contract) return { success: false as const, error: "חוזה לא נמצא" };

  const newPaid = Math.round((contract.paidAmount + data.amount) * 100) / 100;

  const session   = await getSession();
  const actorId   = session?.userId ?? null;
  const actorName = session?.name   ?? "מישהו";

  await db.$transaction([
    db.supplierPayment.create({
      data: {
        contractId,
        date:      new Date(data.date),
        amount:    data.amount,
        reference: data.reference || null,
        notes:     data.notes     || null,
      },
    }),
    db.contract.update({
      where: { id: contractId },
      data:  { paidAmount: newPaid },
    }),
  ]);

  await logActivity({
    userId:      actorId,
    action:      "PAYMENT_SENT",
    entityType:  "CONTRACT",
    entityId:    contractId,
    projectId:   contract.projectId,
    description: `${actorName} רשם תשלום ₪${data.amount.toLocaleString("he-IL")} לקבלן ${contract.supplier.name}`,
  });

  revalidatePath(`/projects/${contract.projectId}`);
  revalidatePath("/finance");
  return { success: true as const };
}

// ─── Global Ledger ────────────────────────────────────────────────────────────

export type LedgerEntry = {
  id:          string;
  date:        string;
  type:        "INBOUND" | "OUTBOUND_SUPPLIER" | "OUTBOUND_EXPENSE";
  amount:      number;
  description: string;
  reference:   string | null;
  projectId:   string | null;
  projectName: string | null;
  entityLabel: string | null;
};

export async function getGlobalLedger(): Promise<LedgerEntry[]> {
  const cid = await currentCompanyId();

  const [payments, supplierPayments, expenses] = await Promise.all([
    db.payment.findMany({
      where:   { invoice: { companyId: cid } },
      orderBy: { date: "desc" },
      select: {
        id:        true,
        date:      true,
        amount:    true,
        reference: true,
        method:    true,
        invoice: {
          select: {
            invoiceNumber: true,
            projectId:     true,
            project:       { select: { name: true } },
            client:        { select: { name: true } },
          },
        },
      },
    }),
    db.supplierPayment.findMany({
      where:   { contract: { companyId: cid } },
      orderBy: { date: "desc" },
      select: {
        id:        true,
        date:      true,
        amount:    true,
        reference: true,
        notes:     true,
        contract: {
          select: {
            projectId: true,
            project:   { select: { name: true } },
            supplier:  { select: { name: true } },
          },
        },
      },
    }),
    db.expense.findMany({
      where:   { project: { companyId: cid } },
      orderBy: { date: "desc" },
      select: {
        id:          true,
        date:        true,
        amount:      true,
        description: true,
        category:    true,
        projectId:   true,
        project:     { select: { name: true } },
      },
    }),
  ]);

  const entries: LedgerEntry[] = [
    ...payments.map((p) => ({
      id:          `pay-${p.id}`,
      date:        p.date.toISOString(),
      type:        "INBOUND" as const,
      amount:      p.amount,
      description: `תקבול — חשבונית #${p.invoice.invoiceNumber}`,
      reference:   p.reference,
      projectId:   p.invoice.projectId,
      projectName: p.invoice.project?.name ?? null,
      entityLabel: p.invoice.client?.name  ?? null,
    })),
    ...supplierPayments.map((sp) => ({
      id:          `supp-${sp.id}`,
      date:        sp.date.toISOString(),
      type:        "OUTBOUND_SUPPLIER" as const,
      amount:      sp.amount,
      description: `תשלום קבלן — ${sp.contract.supplier.name}`,
      reference:   sp.reference,
      projectId:   sp.contract.projectId,
      projectName: sp.contract.project?.name ?? null,
      entityLabel: sp.contract.supplier.name,
    })),
    ...expenses.map((e) => ({
      id:          `exp-${e.id}`,
      date:        e.date.toISOString(),
      type:        "OUTBOUND_EXPENSE" as const,
      amount:      e.amount,
      description: e.description ?? `הוצאה — ${e.category}`,
      reference:   null,
      projectId:   e.projectId,
      projectName: e.project?.name ?? null,
      entityLabel: e.category,
    })),
  ];

  // Sort all entries by date descending
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return entries;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

import { HE_MONTHS } from "@/lib/utils";

export async function getCompanyFinancials() {
  const cid = await currentCompanyId();

  const twelveAgo = new Date();
  twelveAgo.setMonth(twelveAgo.getMonth() - 11);
  twelveAgo.setDate(1);
  twelveAgo.setHours(0, 0, 0, 0);

  const [allInvoices, allExpenses, allTimeEntries, projects] = await Promise.all([
    db.invoice.findMany({
      where: { companyId: cid, date: { gte: twelveAgo } },
      select: { date: true, paidAmount: true, total: true },
    }),
    db.expense.findMany({
      where: { project: { companyId: cid }, date: { gte: twelveAgo } },
      select: { date: true, amount: true },
    }),
    db.timeEntry.findMany({
      where: { project: { companyId: cid }, date: { gte: twelveAgo } },
      select: { date: true, totalCost: true },
    }),
    db.project.findMany({
      where: { companyId: cid },
      select: {
        id: true,
        name: true,
        status: true,
        contractValue: true,
        timeEntries: { select: { totalCost: true } },
        expenses:    { select: { amount: true } },
        contracts: {
          where: { status: { in: ["ACTIVE", "COMPLETED"] } },
          select: { paidAmount: true },
        },
        invoices: { select: { total: true, paidAmount: true } },
      },
    }),
  ]);

  const now = new Date();

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const inMonth = (dt: Date) => {
      const x = new Date(dt);
      return x.getFullYear() === y && x.getMonth() === m;
    };
    const revenue = allInvoices.filter(inv => inMonth(inv.date)).reduce((s, inv) => s + inv.paidAmount, 0);
    const cost =
      allExpenses.filter(e => inMonth(e.date)).reduce((s, e) => s + e.amount, 0) +
      allTimeEntries.filter(te => inMonth(te.date)).reduce((s, te) => s + te.totalCost, 0);
    return { month: HE_MONTHS[m], revenue, cost };
  });

  const projectSummaries = projects.map(p => {
    const cost =
      p.timeEntries.reduce((s, te) => s + te.totalCost, 0) +
      p.expenses.reduce((s, e) => s + e.amount, 0) +
      p.contracts.reduce((s, c) => s + c.paidAmount, 0);
    const paid     = p.invoices.reduce((s, inv) => s + inv.paidAmount, 0);
    const invoiced = p.invoices.reduce((s, inv) => s + inv.total, 0);

    return {
      id:            p.id,
      name:          p.name,
      status:        p.status,
      contractValue: p.contractValue,
      cost,
      paid,
      outstanding:   Math.max(0, invoiced - paid),
      profit:        p.contractValue - cost,
      margin:        p.contractValue > 0 ? ((p.contractValue - cost) / p.contractValue) * 100 : 0,
    };
  });

  const totalRevenue     = projectSummaries.reduce((s, p) => s + p.paid, 0);
  const totalCost        = projectSummaries.reduce((s, p) => s + p.cost, 0);
  const totalOutstanding = projectSummaries.reduce((s, p) => s + p.outstanding, 0);

  return {
    totalRevenue,
    totalCost,
    totalOutstanding,
    grossProfit:   totalRevenue - totalCost,
    profitMargin:  totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
    monthlyData,
    projectSummaries: projectSummaries.sort((a, b) => b.contractValue - a.contractValue),
  };
}
