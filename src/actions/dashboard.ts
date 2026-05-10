"use server";

import { db } from "@/lib/db";

const HE_MONTHS = [
  "ינו׳","פבר׳","מרץ","אפר׳","מאי","יונ׳",
  "יול׳","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳",
];

export async function getDashboardData() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    activeLeadsCount,
    newLeadsCount,
    activeProjectsCount,
    atRiskProjectsCount,
    openTasksCount,
    overdueTasksCount,
    currentMonthAgg,
    prevMonthAgg,
    recentProjects,
    upcomingTasks,
    invoicesForChart,
    recentPayments,
  ] = await Promise.all([
    // Active leads (not converted or lost)
    db.lead.count({
      where: { status: { notIn: ["CONVERTED", "LOST"] } },
    }),
    // Leads with NEW status (pipeline top)
    db.lead.count({ where: { status: "NEW" } }),
    // Active projects
    db.project.count({ where: { status: "ACTIVE" } }),
    // On-hold projects (at risk)
    db.project.count({ where: { status: "ON_HOLD" } }),
    // Open tasks
    db.task.count({ where: { status: { not: "DONE" } } }),
    // Overdue tasks (due date passed, not done)
    db.task.count({
      where: { status: { not: "DONE" }, dueDate: { lt: now } },
    }),
    // Current month revenue (paid invoices)
    db.invoice.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { paidAmount: true },
    }),
    // Previous month revenue (for % change)
    db.invoice.aggregate({
      where: { date: { gte: prevMonthStart, lt: monthStart } },
      _sum: { paidAmount: true },
    }),
    // Active/planning projects for dashboard widget
    db.project.findMany({
      where: { status: { in: ["ACTIVE", "PLANNING"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        contractValue: true,
        progressPercent: true,
        client: { select: { name: true } },
      },
    }),
    // Upcoming tasks (soonest due date, not done)
    db.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        priority: true,
        dueDate: true,
        status: true,
        project: { select: { id: true, name: true } },
      },
    }),
    // Invoice data for 6-month chart
    db.invoice.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, paidAmount: true },
    }),
    // Recent payments for dashboard widget
    db.payment.findMany({
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        date: true,
        method: true,
        invoice: {
          select: {
            invoiceNumber: true,
            client: { select: { name: true } },
            project: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  // Build 6-month chart data (month label + total revenue)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const revenue = invoicesForChart
      .filter(inv => {
        const x = new Date(inv.date);
        return x.getFullYear() === y && x.getMonth() === m;
      })
      .reduce((s, inv) => s + inv.paidAmount, 0);
    return { month: HE_MONTHS[m], revenue };
  });

  const monthlyRevenue = currentMonthAgg._sum.paidAmount ?? 0;
  const prevMonthRevenue = prevMonthAgg._sum.paidAmount ?? 0;
  const totalChartRevenue = chartData.reduce((s, m) => s + m.revenue, 0);

  return {
    kpis: {
      activeLeads: activeLeadsCount,
      newLeads: newLeadsCount,
      activeProjects: activeProjectsCount,
      atRiskProjects: atRiskProjectsCount,
      openTasks: openTasksCount,
      overdueTasks: overdueTasksCount,
      monthlyRevenue,
      prevMonthRevenue,
    },
    projects: recentProjects,
    upcomingTasks,
    chartData,
    currentMonth: HE_MONTHS[now.getMonth()],
    totalChartRevenue,
    avgMonthlyRevenue: Math.round(totalChartRevenue / 6),
    recentPayments,
  };
}
