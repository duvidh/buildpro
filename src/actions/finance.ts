"use server";

import { db } from "@/lib/db";

const HE_MONTHS = [
  "ינו׳","פבר׳","מרץ","אפר׳","מאי","יונ׳",
  "יול׳","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳",
];

export async function getCompanyFinancials() {
  const twelveAgo = new Date();
  twelveAgo.setMonth(twelveAgo.getMonth() - 11);
  twelveAgo.setDate(1);
  twelveAgo.setHours(0, 0, 0, 0);

  const [allInvoices, allExpenses, allTimeEntries, projects] = await Promise.all([
    db.invoice.findMany({
      where: { date: { gte: twelveAgo } },
      select: { date: true, paidAmount: true, total: true },
    }),
    db.expense.findMany({
      where: { date: { gte: twelveAgo } },
      select: { date: true, amount: true },
    }),
    db.timeEntry.findMany({
      where: { date: { gte: twelveAgo } },
      select: { date: true, totalCost: true },
    }),
    db.project.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        contractValue: true,
        timeEntries: { select: { totalCost: true } },
        expenses: { select: { amount: true } },
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
    const paid = p.invoices.reduce((s, inv) => s + inv.paidAmount, 0);
    const invoiced = p.invoices.reduce((s, inv) => s + inv.total, 0);

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      contractValue: p.contractValue,
      cost,
      paid,
      outstanding: Math.max(0, invoiced - paid),
      profit: p.contractValue - cost,
      margin: p.contractValue > 0 ? ((p.contractValue - cost) / p.contractValue) * 100 : 0,
    };
  });

  const totalRevenue = projectSummaries.reduce((s, p) => s + p.paid, 0);
  const totalCost = projectSummaries.reduce((s, p) => s + p.cost, 0);
  const totalOutstanding = projectSummaries.reduce((s, p) => s + p.outstanding, 0);

  return {
    totalRevenue,
    totalCost,
    totalOutstanding,
    grossProfit: totalRevenue - totalCost,
    profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
    monthlyData,
    projectSummaries: projectSummaries.sort((a, b) => b.contractValue - a.contractValue),
  };
}
