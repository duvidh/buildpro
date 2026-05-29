"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

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
