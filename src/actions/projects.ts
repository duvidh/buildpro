"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createProjectSchema, type CreateProjectInput,
  updateProjectSchema, type UpdateProjectInput,
} from "@/lib/schemas/project-schema";
import {
  requireRole,
  PROJECT_ROLES, DELETE_ROLES, FINANCE_VIEW_ROLES, ownerScopeUserId,
} from "@/lib/auth-utils";
import { currentCompanyId } from "@/lib/tenant";

export async function getProjects() {
  const cid = await currentCompanyId();
  const ownerId = await ownerScopeUserId();
  return db.project.findMany({
    where: { companyId: cid, ...(ownerId ? { managerId: ownerId } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      settings: true,
      _count: {
        select: { tasks: true, milestones: true, members: true },
      },
    },
  });
}

export async function createProject(raw: CreateProjectInput) {
  let session;
  try { session = await requireRole(PROJECT_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }
  const { name, description, address, clientId, status, startDate, endDate, contractValue,
    latitude, longitude } = parsed.data;

  const cid = await currentCompanyId();

  // SALES users only see projects they manage — auto-assign as manager on create
  // so the project remains visible to its creator.
  const managerId = session.role === "SALES" ? session.userId : null;

  const project = await db.project.create({
    data: {
      companyId: cid,
      name,
      description: description || null,
      address: address || null,
      clientId,
      managerId,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      contractValue: contractValue ? parseFloat(contractValue) || 0 : 0,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      settings: {
        create: {
          qcEnabled: true,
          risksEnabled: true,
          crEnabled: true,
          milestonesEnabled: true,
          wbsEnabled: true,
          procurementEnabled: true,
          ganttEnabled: true,
        },
      },
    },
  });

  revalidatePath("/projects");
  return { success: true as const, projectId: project.id };
}

export async function updateProject(id: string, raw: UpdateProjectInput) {
  try { await requireRole(PROJECT_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  const parsed = updateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }
  const { name, description, address, status, startDate, endDate, contractValue,
    latitude, longitude } = parsed.data;

  const cid = await currentCompanyId();
  const owned = await db.project.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const, error: "אין הרשאה לבצע פעולה זו" };

  await db.project.update({
    where: { id },
    data: {
      name,
      description: description || null,
      address: address || null,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      contractValue: contractValue ? parseFloat(contractValue) || 0 : 0,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/clients");
  return { success: true as const };
}

export async function deleteProject(id: string) {
  try { await requireRole(DELETE_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  const cid = await currentCompanyId();
  const owned = await db.project.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const, error: "אין הרשאה לבצע פעולה זו" };

  try {
    // All child relations now have onDelete: Cascade in the schema —
    // a single delete cascades through Tasks, Milestones, Invoices, Contracts,
    // TimeEntries, Expenses, EquipmentLogs, DailyLogs, Quotes, etc.
    await db.project.delete({ where: { id } });

    revalidatePath("/projects");
    revalidatePath("/clients");
    revalidatePath("/finance");
    return { success: true as const };
  } catch (e) {
    console.error("deleteProject error:", e);
    return { success: false as const, error: "שגיאה במחיקת הפרויקט" };
  }
}

export async function updateProjectSettings(
  projectId: string,
  patch: Partial<{
    qcEnabled: boolean;
    risksEnabled: boolean;
    crEnabled: boolean;
    milestonesEnabled: boolean;
    wbsEnabled: boolean;
    procurementEnabled: boolean;
    ganttEnabled: boolean;
  }>
) {
  try { await requireRole(PROJECT_ROLES); }
  catch { return { success: false as const, error: "אין הרשאה לבצע פעולה זו" }; }

  const cid = await currentCompanyId();
  const owned = await db.project.findFirst({ where: { id: projectId, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const, error: "אין הרשאה לבצע פעולה זו" };

  await db.projectSettings.update({
    where: { projectId },
    data: patch,
  });
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}

// ─── Focused per-tab queries ──────────────────────────────────────────────────

/** Tenant filter for child-table queries: rows must belong to a project in the caller's company. */
async function projectScope(id: string) {
  const cid = await currentCompanyId();
  return { projectId: id, project: { companyId: cid } };
}

/** Lean header query for layout.tsx — deduped via React cache. */
export const getProjectHeader = cache(async (id: string) => {
  const cid = await currentCompanyId();
  return db.project.findFirst({
    where: { id, companyId: cid },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      contractValue: true,
      progressPercent: true,
      address: true,
      latitude: true,
      longitude: true,
      startDate: true,
      endDate: true,
      client: { select: { id: true, name: true, phone: true } },
      manager: { select: { id: true, name: true } },
      settings: true,
      _count: {
        select: {
          tasks: true, milestones: true, qualityChecks: true, ncrs: true,
          risks: true, changeRequests: true, contracts: true, files: true, workPackages: true,
        },
      },
    },
  });
});

/** Overview tab: recent tasks + upcoming milestones + team members. */
export async function getProjectOverview(id: string) {
  const cid = await currentCompanyId();
  return db.project.findFirst({
    where: { id, companyId: cid },
    select: {
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      milestones: {
        where: { completed: false },
        orderBy: { order: "asc" },
        take: 3,
      },
      members: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        take: 8,
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { tasks: true, files: true } },
    },
  });
}

/** Tasks tab: all tasks with assignments. */
export async function getProjectTasks(id: string) {
  return db.task.findMany({
    where: await projectScope(id),
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
}

/**
 * Financials tab — display tables only.
 * Aggregated KPIs (labor, expenses, sub-costs, invoiced totals) are
 * fetched separately via getProjectFinancialSummary() in finance-analytics.ts.
 */
export async function getProjectFinancials(id: string) {
  try { await requireRole(FINANCE_VIEW_ROLES); }
  catch { return null; }

  const cid = await currentCompanyId();
  return db.project.findFirst({
    where: { id, companyId: cid },
    select: {
      contractValue: true,
      invoices: {
        orderBy: { date: "desc" },
        include: { payments: { orderBy: { date: "desc" } } },
      },
      contracts: {
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { id: true, name: true, type: true } },
          payments: { orderBy: { date: "desc" } },
        },
      },
    },
  });
}

/** Field tab: time entries, expenses, daily logs. */
export async function getProjectField(id: string) {
  const cid = await currentCompanyId();
  return db.project.findFirst({
    where: { id, companyId: cid },
    select: {
      timeEntries: {
        orderBy: { date: "desc" },
        take: 50,
        include: { employee: { select: { id: true, name: true } } },
      },
      expenses: {
        orderBy: { date: "desc" },
        take: 50,
        include: { employee: { select: { id: true, name: true } } },
      },
      dailyLogs: {
        orderBy: { date: "desc" },
        take: 30,
        include: { supervisor: { select: { id: true, name: true } } },
      },
    },
  });
}

/** Team tab: members and active equipment. */
export async function getProjectTeam(id: string) {
  const cid = await currentCompanyId();
  return db.project.findFirst({
    where: { id, companyId: cid },
    select: {
      members: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      equipmentLogs: {
        where: { checkInDate: null },
        include: { equipment: { select: { id: true, name: true, code: true, status: true } } },
        orderBy: { checkOutDate: "desc" },
      },
    },
  });
}

/** Settings tab: just the project settings row. */
export async function getProjectSettings(id: string) {
  return db.projectSettings.findFirst({ where: await projectScope(id) });
}

/** Milestones tab. */
export async function getProjectMilestones(id: string) {
  return db.milestone.findMany({
    where: await projectScope(id),
    orderBy: { order: "asc" },
    select: {
      id: true, projectId: true, name: true, date: true,
      weight: true, completed: true, completedAt: true,
      notes: true, order: true, invoiceId: true,
    },
  });
}

/** QC tab: quality checks + NCRs. */
export async function getProjectQC(id: string) {
  const scope = await projectScope(id);
  const [qualityChecks, ncrs] = await Promise.all([
    db.qualityCheck.findMany({
      where: scope,
      orderBy: { date: "desc" },
      take: 30,
    }),
    db.nCR.findMany({
      where: scope,
      orderBy: { date: "desc" },
      take: 20,
    }),
  ]);
  return { qualityChecks, ncrs };
}

/** Risks tab. */
export async function getProjectRisks(id: string) {
  return db.risk.findMany({
    where: await projectScope(id),
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/** Change Requests tab. */
export async function getProjectCR(id: string) {
  return db.changeRequest.findMany({
    where: await projectScope(id),
    orderBy: { date: "desc" },
    select: {
      id: true, status: true, costImpact: true, description: true,
      date: true, requestedBy: true, scheduleImpact: true, approvedAt: true,
    },
  });
}

/** Procurement tab: subcontractor contracts. */
export async function getProjectProcurement(id: string) {
  return db.contract.findMany({
    where: await projectScope(id),
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { id: true, name: true, type: true } },
      payments: { orderBy: { date: "desc" } },
    },
  });
}

/** WBS / Gantt tab: work packages. */
export async function getProjectWorkPackages(id: string) {
  return db.workPackage.findMany({
    where: await projectScope(id),
    orderBy: { order: "asc" },
  });
}

/** Task completion counts — safe for all roles including FIELD_WORKER. */
export async function getProjectTaskProgress(id: string) {
  const groups = await db.task.groupBy({
    by: ["status"],
    where: await projectScope(id),
    _count: { id: true },
  });
  const total = groups.reduce((s, g) => s + g._count.id, 0);
  const done  = groups.find((g) => g.status === "DONE")?._count.id ?? 0;
  return { total, done };
}

// Legacy full-fetch (kept for backwards compatibility)
export async function getProjectById(id: string) {
  const cid = await currentCompanyId();
  return db.project.findFirst({
    where: { id, companyId: cid },
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      settings: true,
      members: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      milestones: { orderBy: { order: "asc" } },
      timeEntries: {
        orderBy: { date: "desc" },
        take: 50,
        include: { employee: { select: { id: true, name: true } } },
      },
      expenses: {
        orderBy: { date: "desc" },
        take: 50,
        include: { employee: { select: { id: true, name: true } } },
      },
      dailyLogs: {
        orderBy: { date: "desc" },
        take: 30,
        include: { supervisor: { select: { id: true, name: true } } },
      },
      changeRequests: {
        orderBy: { date: "desc" },
        select: {
          id: true, status: true, costImpact: true, description: true, date: true,
          requestedBy: true, scheduleImpact: true, approvedAt: true,
        },
      },
      qualityChecks: { orderBy: { date: "desc" }, take: 30 },
      ncrs: { orderBy: { date: "desc" }, take: 20 },
      risks: { orderBy: { createdAt: "desc" }, take: 20 },
      workPackages: { orderBy: { order: "asc" } },
      invoices: {
        orderBy: { date: "desc" },
        include: { payments: { orderBy: { date: "desc" } } },
      },
      contracts: {
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { id: true, name: true, type: true } },
          payments: { orderBy: { date: "desc" } },
        },
      },
      equipmentLogs: {
        where: { checkInDate: null },
        include: { equipment: { select: { id: true, name: true, code: true, status: true } } },
        orderBy: { checkOutDate: "desc" },
      },
      _count: {
        select: {
          tasks: true, milestones: true, qualityChecks: true, ncrs: true, risks: true,
          changeRequests: true, contracts: true, workPackages: true, files: true,
        },
      },
    },
  });
}
