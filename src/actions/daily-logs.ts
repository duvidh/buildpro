"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, type UserRole } from "@/lib/auth-utils";
import { currentCompanyId } from "@/lib/tenant";

// Field crews report too — every operational role may write a daily log.
const DAILY_LOG_ROLES: UserRole[] = [
  "ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER", "FIELD_WORKER",
];

const createDailyLogSchema = z.object({
  projectId:       z.string().min(1),
  date:            z.string().min(1),
  weather:         z.string().optional(),
  workforceCount:  z.coerce.number().int().min(0).max(10000).optional(),
  progressNotes:   z.string().optional(),
  safetyIssues:    z.string().optional(),
});

export type CreateDailyLogInput = z.input<typeof createDailyLogSchema>;

/** Normalize to midnight so the @@unique([projectId, date]) key is stable. */
function toLogDate(raw: string): Date | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** All daily logs for one project, newest first (tenant-scoped). */
export async function getDailyLogs(projectId: string) {
  const cid = await currentCompanyId();
  return db.dailyLog.findMany({
    where: { projectId, companyId: cid },
    orderBy: { date: "desc" },
    include: { supervisor: { select: { id: true, name: true } } },
  });
}

/**
 * Create a daily log for a project. One log per project per day — a second
 * submission for the same date returns a "duplicate" error instead of
 * silently overwriting the foreman's earlier report.
 */
export async function createDailyLog(raw: CreateDailyLogInput) {
  const parsed = createDailyLogSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: "validation" as const };
  }
  const { projectId, weather, workforceCount, progressNotes, safetyIssues } = parsed.data;

  const date = toLogDate(parsed.data.date);
  if (!date) return { success: false as const, error: "validation" as const };

  const session = await requireRole(DAILY_LOG_ROLES);
  const cid = await currentCompanyId();

  // Owned-check: the project must belong to this company.
  const project = await db.project.findFirst({
    where: { id: projectId, companyId: cid },
    select: { id: true },
  });
  if (!project) return { success: false as const, error: "not_found" as const };

  const existing = await db.dailyLog.findUnique({
    where: { projectId_date: { projectId, date } },
    select: { id: true },
  });
  if (existing) return { success: false as const, error: "duplicate" as const };

  const log = await db.dailyLog.create({
    data: {
      companyId:         cid,
      projectId,
      supervisorId:      session.userId,
      date,
      weatherConditions: weather?.trim() || null,
      workforceCount:    workforceCount ?? null,
      notes:             progressNotes?.trim() || null,
      safetyIncidents:   safetyIssues?.trim() || null,
    },
    include: { supervisor: { select: { id: true, name: true } } },
  });

  revalidatePath(`/projects/${projectId}/logs`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/daily-logs");
  return { success: true as const, log };
}

/**
 * AI-assistant approval flow: persist a daily log the user confirmed in the
 * chat UI. Defaults the date to today when the model didn't extract one.
 */
export async function executeCreateDailyLog(payload: {
  projectId: string;
  date?: string;
  weather?: string;
  workforceCount?: number;
  progressNotes?: string;
  safetyIssues?: string;
}) {
  return createDailyLog({
    projectId:      payload.projectId,
    date:           payload.date?.trim() || new Date().toISOString(),
    weather:        payload.weather,
    workforceCount: payload.workforceCount,
    progressNotes:  payload.progressNotes,
    safetyIssues:   payload.safetyIssues,
  });
}
