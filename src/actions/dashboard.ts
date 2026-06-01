import { db } from "@/lib/db";
import { HE_MONTHS } from "@/lib/utils";
import { currentCompanyId } from "@/lib/tenant";
import type { DashboardMapProject } from "@/components/dashboard/widgets/types";

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
    mapProjects: [] as DashboardMapProject[],
  };
}

export async function getDashboardData() {
  const now = new Date();

  try {
  const cid = await currentCompanyId();
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
    mapProjectsRaw,
  ] = await Promise.all([
    db.lead.count({ where: { status: { notIn: ["CONVERTED", "LOST"] }, companyId: cid } }),
    db.lead.count({ where: { status: "NEW", companyId: cid } }),
    db.project.count({ where: { status: "ACTIVE", companyId: cid } }),
    db.project.count({ where: { status: "ON_HOLD", companyId: cid } }),
    db.task.count({ where: { status: { not: "DONE" }, companyId: cid } }),
    db.task.count({ where: { status: { not: "DONE" }, dueDate: { lt: now }, companyId: cid } }),
    db.invoice.aggregate({ where: { date: { gte: monthStart }, companyId: cid }, _sum: { paidAmount: true } }),
    db.invoice.aggregate({ where: { date: { gte: prevMonthStart, lt: monthStart }, companyId: cid }, _sum: { paidAmount: true } }),

    db.project.findMany({
      where: { status: { in: ["ACTIVE", "PLANNING"] }, companyId: cid },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true, name: true, status: true,
        contractValue: true, progressPercent: true,
        client: { select: { name: true } },
      },
    }),

    db.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { not: null }, companyId: cid },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: {
        id: true, name: true, priority: true, dueDate: true, status: true,
        project: { select: { id: true, name: true } },
      },
    }),

    db.invoice.findMany({
      where: { date: { gte: sixMonthsAgo }, companyId: cid },
      select: { date: true, paidAmount: true },
    }),

    db.payment.findMany({
      where: { invoice: { companyId: cid } },
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
      where: { completed: false, project: { companyId: cid } },
      orderBy: { date: "asc" },
      take: 6,
      select: {
        id: true, name: true, date: true, completed: true,
        project: { select: { id: true, name: true } },
      },
    }),

    // Unpaid / partially paid invoices
    db.invoice.findMany({
      where: { status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] }, companyId: cid },
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
      where: { companyId: cid },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, action: true, entityType: true, details: true, createdAt: true,
        user: { select: { name: true } },
      },
    }),

    // ALL projects that have coordinates — for the map widget
    db.project.findMany({
      where: { latitude: { not: null }, longitude: { not: null }, companyId: cid },
      select: {
        id: true, name: true, status: true, address: true,
        latitude: true, longitude: true,
      },
    }),
  ]);

  // The where-clause guarantees coordinates are present, but Prisma still types
  // them as number | null — narrow them here.
  const mapProjects: DashboardMapProject[] = mapProjectsRaw
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      address: p.address,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
    }));

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
    mapProjects,
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
