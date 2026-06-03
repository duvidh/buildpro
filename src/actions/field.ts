"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ExpenseCategory } from "@/generated/prisma/client";
import { getSession } from "@/lib/session";
import { requireRole, type UserRole } from "@/lib/auth-utils";
import { currentCompanyId } from "@/lib/tenant";

// ─── Aggregate page fetch ─────────────────────────────────────────────────────

export async function getFieldPageData(projectId: string) {
  const [dailyLogs, timeEntries, expenses, members] = await Promise.all([
    db.dailyLog.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
      include: { supervisor: { select: { id: true, name: true } } },
    }),
    db.timeEntry.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
      take: 50,
      include: { employee: { select: { id: true, name: true } } },
    }),
    db.expense.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
      take: 50,
      include: { employee: { select: { id: true, name: true } } },
    }),
    db.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return { projectId, dailyLogs, timeEntries, expenses, members };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getEmployees() {
  const cid = await currentCompanyId();
  return db.employee.findMany({
    where: { active: true, companyId: cid },
    orderBy: { name: "asc" },
    select: { id: true, name: true, hourlyRate: true },
  });
}

export async function getActiveProjects() {
  const cid = await currentCompanyId();
  return db.project.findMany({
    where: { status: { in: ["ACTIVE", "PLANNING"] }, companyId: cid },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getTimeEntriesByProject(projectId: string) {
  return db.timeEntry.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
    include: { employee: { select: { id: true, name: true } } },
  });
}

export async function getExpensesByProject(projectId: string) {
  return db.expense.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
    include: { employee: { select: { id: true, name: true } } },
  });
}

export async function getDailyLogsByProject(projectId: string) {
  return db.dailyLog.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
    include: { supervisor: { select: { id: true, name: true } } },
  });
}

export async function getAllDailyLogs() {
  const cid = await currentCompanyId();
  return db.dailyLog.findMany({
    where: { companyId: cid },
    orderBy: { date: "desc" },
    take: 100,
    include: {
      project: { select: { id: true, name: true } },
      supervisor: { select: { id: true, name: true } },
    },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTimeEntry(data: {
  projectId: string;
  employeeId: string;
  date: string;
  hours: number;
  hourlyRate: number;
  description?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized access");
  const { projectId, employeeId, date, hours, hourlyRate, description } = data;
  await db.timeEntry.create({
    data: {
      projectId,
      employeeId,
      date: new Date(date),
      hours,
      hourlyRate,
      totalCost: hours * hourlyRate,
      description: description || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/field");
  return { success: true as const };
}

export async function createExpense(data: {
  projectId: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  receiptUrl?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized access");
  const { projectId, date, amount, category, description, receiptUrl } = data;
  await db.expense.create({
    data: {
      projectId,
      date: new Date(date),
      amount,
      category: category as ExpenseCategory,
      description: description || null,
      receiptUrl: receiptUrl || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/field");
  return { success: true as const };
}

export async function createDailyLog(data: {
  projectId: string;
  date: string;
  weatherConditions?: string;
  visitors?: string;
  safetyIncidents?: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized access");
  const { projectId, date, weatherConditions, visitors, safetyIncidents, notes } = data;

  const existing = await db.dailyLog.findUnique({
    where: { projectId_date: { projectId, date: new Date(date) } },
  });
  if (existing) {
    return { success: false as const, error: "יומן עבודה כבר קיים לתאריך זה." };
  }

  const cid = await currentCompanyId();
  const log = await db.dailyLog.create({
    data: {
      companyId: cid,
      projectId,
      supervisorId: session.userId,
      date: new Date(date),
      weatherConditions: weatherConditions || null,
      visitors: visitors || null,
      safetyIncidents: safetyIncidents || null,
      notes: notes || null,
    },
    include: { supervisor: { select: { id: true, name: true } } },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/field");
  return { success: true as const, log };
}

// ─── Quick Mobile Log ─────────────────────────────────────────────────────────

const DAILY_LOG_ROLES: UserRole[] = [
  "ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER", "FIELD_WORKER",
];

export async function createQuickDailyLog(data: {
  projectId: string;
  notes?: string;
  weather?: string;
}) {
  const session = await requireRole(DAILY_LOG_ROLES);
  const { projectId, notes, weather } = data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await db.dailyLog.findUnique({
    where: { projectId_date: { projectId, date: today } },
  });
  if (existing) {
    return { success: false as const, error: "duplicate" as const };
  }

  const cid = await currentCompanyId();
  const log = await db.dailyLog.create({
    data: {
      companyId: cid,
      projectId,
      supervisorId: session.userId,
      date: today,
      weatherConditions: weather || null,
      notes: notes || null,
    },
    include: { supervisor: { select: { id: true, name: true } } },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/field");
  return { success: true as const, log };
}

export async function updateDailyLog(
  id: string,
  projectId: string,
  data: {
    weatherConditions?: string;
    visitors?: string;
    safetyIncidents?: string;
    notes?: string;
  },
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized access");
  await db.dailyLog.update({
    where: { id },
    data: {
      weatherConditions: data.weatherConditions || null,
      visitors: data.visitors || null,
      safetyIncidents: data.safetyIncidents || null,
      notes: data.notes || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
