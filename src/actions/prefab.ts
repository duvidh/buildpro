"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { PrefabStatus } from "@/generated/prisma/client";
import { getSession } from "@/lib/session";
import { logActivity, sendNotification } from "@/lib/activity";

// ─── Validation ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:                z.string().min(1, "שם נדרש"),
  elementType:         z.string().min(1, "סוג אלמנט נדרש"),
  productionStartDate: z.string().optional(),
  targetDeliveryDate:  z.string().optional(),
  taskId:              z.string().optional(),
  notes:               z.string().optional(),
});

export type CreatePrefabInput = z.infer<typeof createSchema>;

// ─── Hebrew label map ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PrefabStatus, string> = {
  PLANNED:            "מתוכנן",
  IN_PRODUCTION:      "בייצור",
  QUALITY_CHECK:      "בקרת איכות",
  READY_FOR_DISPATCH: "מוכן למשלוח",
  SHIPPED:            "נשלח",
  DELIVERED:          "נמסר",
  INSTALLED:          "הותקן",
};

// Statuses that warrant notifying the project manager
const MILESTONE_STATUSES: PrefabStatus[] = ["SHIPPED", "DELIVERED", "INSTALLED"];

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPrefabElements(projectId: string) {
  return db.prefabElement.findMany({
    where:   { projectId },
    orderBy: [{ targetDeliveryDate: "asc" }, { createdAt: "asc" }],
    include: {
      task: { select: { id: true, name: true } },
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPrefabElement(
  projectId: string,
  raw: CreatePrefabInput
) {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { name, elementType, productionStartDate, targetDeliveryDate, taskId, notes } =
    parsed.data;

  await db.prefabElement.create({
    data: {
      projectId,
      name,
      elementType,
      productionStartDate: productionStartDate ? new Date(productionStartDate) : null,
      targetDeliveryDate:  targetDeliveryDate  ? new Date(targetDeliveryDate)  : null,
      taskId: taskId || null,
      notes:  notes  || null,
    },
  });

  revalidatePath(`/projects/${projectId}/prefab`);
  return { success: true as const };
}

export async function updatePrefabElementStatus(
  id: string,
  status: PrefabStatus,
  projectId: string
) {
  const session   = await getSession();
  const actorId   = session?.userId ?? null;
  const actorName = session?.name   ?? "מישהו";

  const element = await db.prefabElement.update({
    where:  { id },
    data:   { status },
    select: { name: true },
  });

  const statusHe = STATUS_LABEL[status];
  const desc = `${actorName} עדכן סטטוס אלמנט "${element.name}" ל${statusHe}`;

  await logActivity({
    userId:      actorId,
    action:      "PREFAB_STATUS_CHANGED",
    entityType:  "PREFAB",
    entityId:    id,
    projectId,
    description: desc,
  });

  // Notify PM on key milestones (shipped / delivered / installed)
  if (MILESTONE_STATUSES.includes(status)) {
    const project = await db.project.findUnique({
      where:  { id: projectId },
      select: { managerId: true },
    });
    const managerId = project?.managerId ?? null;
    if (managerId && managerId !== actorId) {
      await sendNotification({
        userId:      managerId,
        type:        "PREFAB_MILESTONE",
        title:       `🏭 אלמנט ייצור: ${statusHe}`,
        body:        `"${element.name}" — ${desc}`,
        relatedId:   id,
        relatedType: "PREFAB",
      });
    }
  }

  revalidatePath(`/projects/${projectId}/prefab`);
  return { success: true as const };
}

export async function updatePrefabElement(
  id: string,
  projectId: string,
  raw: CreatePrefabInput
) {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאה" };
  }
  const { name, elementType, productionStartDate, targetDeliveryDate, taskId, notes } =
    parsed.data;

  await db.prefabElement.update({
    where: { id },
    data: {
      name,
      elementType,
      productionStartDate: productionStartDate ? new Date(productionStartDate) : null,
      targetDeliveryDate:  targetDeliveryDate  ? new Date(targetDeliveryDate)  : null,
      taskId: taskId || null,
      notes:  notes  || null,
    },
  });

  revalidatePath(`/projects/${projectId}/prefab`);
  return { success: true as const };
}

export async function deletePrefabElement(id: string, projectId: string) {
  await db.prefabElement.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/prefab`);
  return { success: true as const };
}
