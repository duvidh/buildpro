"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createProjectSchema, type CreateProjectInput,
  updateProjectSchema, type UpdateProjectInput,
} from "@/lib/schemas/project-schema";

export async function getProjects() {
  return db.project.findMany({
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
  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }
  const { name, description, address, clientId, status, startDate, endDate, contractValue } =
    parsed.data;

  const project = await db.project.create({
    data: {
      name,
      description: description || null,
      address: address || null,
      clientId,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      contractValue: contractValue ? parseFloat(contractValue) || 0 : 0,
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

export async function getProjectById(id: string) {
  return db.project.findUnique({
    where: { id },
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
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      },
      milestones: {
        orderBy: { order: "asc" },
      },
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
      qualityChecks: {
        orderBy: { date: "desc" },
        take: 30,
      },
      ncrs: {
        orderBy: { date: "desc" },
        take: 20,
      },
      risks: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      workPackages: {
        orderBy: { order: "asc" },
      },
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
        include: {
          equipment: { select: { id: true, name: true, code: true, status: true } },
        },
        orderBy: { checkOutDate: "desc" },
      },
      _count: {
        select: {
          tasks: true,
          milestones: true,
          qualityChecks: true,
          ncrs: true,
          risks: true,
          changeRequests: true,
          contracts: true,
          workPackages: true,
          files: true,
        },
      },
    },
  });
}

export async function updateProject(id: string, raw: UpdateProjectInput) {
  const parsed = updateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }
  const { name, description, address, status, startDate, endDate, contractValue } = parsed.data;
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
    },
  });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/clients");
  return { success: true as const };
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
  await db.projectSettings.update({
    where: { projectId },
    data: patch,
  });
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
