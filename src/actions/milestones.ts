"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createMilestoneSchema, type CreateMilestoneInput } from "@/lib/schemas/milestone-schema";
import { requireRole, PROJECT_ROLES, DELETE_ROLES } from "@/lib/auth-utils";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function createMilestone(raw: CreateMilestoneInput) {
  await requireRole(PROJECT_ROLES);
  const parsed = createMilestoneSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }
  const { projectId, name, date, weight, notes } = parsed.data;

  const last = await db.milestone.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const milestone = await db.milestone.create({
    data: {
      projectId,
      name,
      date: new Date(date),
      weight: weight ? parseFloat(weight) || 1 : 1,
      notes: notes || null,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const, milestoneId: milestone.id };
}

export async function toggleMilestoneComplete(id: string, completed: boolean) {
  await requireRole(PROJECT_ROLES);
  const ms = await db.milestone.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  revalidatePath(`/projects/${ms.projectId}`);
  return { success: true as const };
}

export async function deleteMilestone(id: string) {
  await requireRole(DELETE_ROLES);
  const ms = await db.milestone.delete({ where: { id } });
  revalidatePath(`/projects/${ms.projectId}`);
  return { success: true as const };
}

export async function logWhatsAppUpdate(projectId: string) {
  const session = await getSession();
  if (!session) return;
  await logActivity({
    userId:      session.userId,
    action:      "WHATSAPP_UPDATE_SENT",
    entityType:  "PROJECT",
    entityId:    projectId,
    projectId,
    description: "נשלח עדכון סטטוס ללקוח דרך WhatsApp",
  });
}

export async function seedProjectMilestones(projectId: string) {
  const existing = await db.milestone.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  const now = new Date();
  const d = (days: number) => new Date(now.getTime() + days * 86400000);

  const milestones = [
    {
      name: "השלמת עבודות עפר וחפירה",
      date: d(-60),
      weight: 2,
      completed: true,
      completedAt: d(-58),
      order: 0,
      notes: "בוצע בהצלחה לפי לוח הזמנים",
    },
    {
      name: "אישור יציקת יסודות ע״י מהנדס",
      date: d(-30),
      weight: 3,
      completed: true,
      completedAt: d(-27),
      order: 1,
      notes: "אושר ע״י מהנדס ד׳ זילברמן",
    },
    {
      name: "השלמת שלד קומה א׳",
      date: d(14),
      weight: 3,
      completed: false,
      completedAt: null,
      order: 2,
      notes: null,
    },
    {
      name: "אישור בדק בית ביניים",
      date: d(45),
      weight: 2,
      completed: false,
      completedAt: null,
      order: 3,
      notes: "נדרש פיקוח עיריה",
    },
    {
      name: "גמר ומסירה ללקוח",
      date: d(90),
      weight: 5,
      completed: false,
      completedAt: null,
      order: 4,
      notes: null,
    },
  ];

  for (const m of milestones) {
    await db.milestone.create({ data: { projectId, ...m } });
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
