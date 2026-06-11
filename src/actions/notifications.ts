"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { currentCompanyId } from "@/lib/tenant";

// ─── Notification queries ─────────────────────────────────────────────────────

/** Returns the 25 most recent notifications for the logged-in user. */
export async function getUserNotifications() {
  const session = await getSession();
  if (!session) return [];

  return db.notification.findMany({
    where:   { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take:    25,
  });
}

// ─── Task alerts (derived, not persisted) ─────────────────────────────────────

export type TaskAlert = {
  id: string;
  name: string;
  dueDate: string; // ISO
  projectId: string | null;
  projectName: string | null;
};

const TASK_ALERT_SELECT = {
  id: true,
  name: true,
  dueDate: true,
  projectId: true,
  project: { select: { name: true } },
} as const;

function toAlert(t: {
  id: string;
  name: string;
  dueDate: Date | null;
  projectId: string | null;
  project: { name: string } | null;
}): TaskAlert {
  return {
    id: t.id,
    name: t.name,
    dueDate: t.dueDate?.toISOString() ?? "",
    projectId: t.projectId,
    projectName: t.project?.name ?? null,
  };
}

/**
 * Schedule alerts for the bell: company tasks that are overdue, or due within
 * the next 3 days (excluding DONE).
 */
export async function getTaskAlerts(): Promise<{
  overdue: TaskAlert[];
  upcoming: TaskAlert[];
}> {
  const session = await getSession();
  if (!session) return { overdue: [], upcoming: [] };

  try {
    const cid = await currentCompanyId();
    const now = new Date();
    const inThreeDays = new Date(now.getTime() + 3 * 86_400_000);

    const [overdue, upcoming] = await Promise.all([
      db.task.findMany({
        where: { companyId: cid, status: { not: "DONE" }, dueDate: { lt: now } },
        orderBy: { dueDate: "asc" },
        take: 6,
        select: TASK_ALERT_SELECT,
      }),
      db.task.findMany({
        where: {
          companyId: cid,
          status: { not: "DONE" },
          dueDate: { gte: now, lte: inThreeDays },
        },
        orderBy: { dueDate: "asc" },
        take: 6,
        select: TASK_ALERT_SELECT,
      }),
    ]);

    return { overdue: overdue.map(toAlert), upcoming: upcoming.map(toAlert) };
  } catch (e) {
    console.error("[getTaskAlerts] failed:", e instanceof Error ? e.message : e);
    return { overdue: [], upcoming: [] };
  }
}

/** Count of unread notifications for the logged-in user. */
export async function getUnreadNotificationCount(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;

  return db.notification.count({
    where: { userId: session.userId, read: false },
  });
}

/** Mark a single notification as read (scoped to current user). */
export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session) return { success: false as const };

  await db.notification.updateMany({
    where: { id, userId: session.userId },
    data:  { read: true },
  });
  return { success: true as const };
}

/** Mark all notifications for the current user as read. */
export async function markAllNotificationsRead() {
  const session = await getSession();
  if (!session) return { success: false as const };

  await db.notification.updateMany({
    where: { userId: session.userId, read: false },
    data:  { read: true },
  });
  revalidatePath("/");
  return { success: true as const };
}

// ─── Project activity feed ────────────────────────────────────────────────────

/**
 * Fetch recent ActivityLog entries for a project.
 * Filters by projectId embedded in the details JSON string.
 */
export async function getProjectActivity(projectId: string, limit = 15) {
  return db.activityLog.findMany({
    where:   { details: { contains: projectId } },
    orderBy: { createdAt: "desc" },
    take:    limit,
    include: { user: { select: { id: true, name: true } } },
  });
}
