import { db } from "@/lib/db";
import { HE_MONTHS } from "@/lib/utils";

// ─── Empty-data fallback ──────────────────────────────────────────────────────

function buildEmptyData(now: Date) {
  return {
    kpis: {
      activeLeads: 0,
      newLeads: 0,
      activeProjects: 0,
      atRiskProjects: 0,
      openTasks: 0,
      overdueTasks: 0,
      monthlyRevenue: 0,
      prevMonthRevenue: 0,
    },
    projects: [] as never[],
    upcomingTasks: [] as never[],
    chartData: Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: HE_MONTHS[d.getMonth()], revenue: 0 };
    }),
    currentMonth: HE_MONTHS[now.getMonth()],
    totalChartRevenue: 0,
    avgMonthlyRevenue: 0,
    recentPayments: [] as never[],
    upcomingMilestones: [] as never[],
    invoicesDue: [] as never[],
    recentActivity: [] as never[],
  };
}

export async function getDashboardData() {
  const now = new Date();

  try {
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

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
    upcomingMilestones,
    invoicesDue,
    recentActivity,
  ] = await Promise.all([
    db.lead.count({ where: { status: { notIn: ["CONVERTED", "LOST"] } } }),
    db.lead.count({ where: { status: "NEW" } }),
    db.project.count({ where: { status: "ACTIVE" } }),
    db.project.count({ where: { status: "ON_HOLD" } }),
    db.task.count({ where: { status: { not: "DONE" } } }),
    db.task.count({ where: { status: { not: "DONE" }, dueDate: { lt: now } } }),
    db.invoice.aggregate({ where: { date: { gte: monthStart } }, _sum: { paidAmount: true } }),
    db.invoice.aggregate({ where: { date: { gte: prevMonthStart, lt: monthStart } }, _sum: { paidAmount: true } }),

    db.project.findMany({
      where: { status: { in: ["ACTIVE", "PLANNING"] } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true, name: true, status: true,
        contractValue: true, progressPercent: true,
        client: { select: { name: true } },
      },
    }),

    db.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: {
        id: true, name: true, priority: true, dueDate: true, status: true,
        project: { select: { id: true, name: true } },
      },
    }),

    db.invoice.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, paidAmount: true },
    }),

    db.payment.findMany({
      orderBy: { date: "desc" },
      take: 6,
      select: {
        id: true, amount: true, date: true, method: true,
        invoice: {
          select: {
            invoiceNumber: true,
            client: { select: { name: true } },
            project: { select: { name: true } },
          },
        },
      },
    }),

    // Upcoming milestones (not completed, future dates)
    db.milestone.findMany({
      where: { completed: false },
      orderBy: { date: "asc" },
      take: 6,
      select: {
        id: true, name: true, date: true, completed: true,
        project: { select: { id: true, name: true } },
      },
    }),

    // Unpaid / partially paid invoices
    db.invoice.findMany({
      where: { status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] } },
      orderBy: [{ status: "desc" }, { dueDate: "asc" }],
      take: 6,
      select: {
        id: true, invoiceNumber: true, total: true, paidAmount: true,
        status: true, dueDate: true,
        client: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),

    // Recent activity log
    db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, action: true, entityType: true, details: true, createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  // Build 6-month chart data
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

  const monthlyRevenue    = currentMonthAgg._sum.paidAmount ?? 0;
  const prevMonthRevenue  = prevMonthAgg._sum.paidAmount   ?? 0;
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
    upcomingMilestones,
    invoicesDue,
    recentActivity,
  };
  } catch (err) {
    // Rethrow Next.js internal signals (redirect, notFound, etc.) — never swallow them.
    if (
      err != null &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: unknown }).digest === "string" &&
      ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (err as { digest: string }).digest.startsWith("NEXT_NOT_FOUND") ||
        (err as { digest: string }).digest.startsWith("NEXT_HTTP_ERROR"))
    ) {
      throw err;
    }
    console.error("[getDashboardData] DB query failed — rendering empty dashboard:", err);
    return buildEmptyData(now);
  }
}
