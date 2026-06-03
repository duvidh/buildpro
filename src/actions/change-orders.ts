"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ChangeRequestStatus } from "@/generated/prisma/client";
import { requireRole, PROJECT_ROLES, FINANCE_WRITE_ROLES } from "@/lib/auth-utils";

export async function createChangeRequest(data: {
  projectId: string;
  description: string;
  requestedBy: string;
  costImpact: number;
  scheduleImpact?: number;
}) {
  await requireRole(PROJECT_ROLES);
  await db.changeRequest.create({
    data: {
      projectId: data.projectId,
      description: data.description,
      requestedBy: data.requestedBy,
      costImpact: data.costImpact,
      scheduleImpact: data.scheduleImpact ?? 0,
      status: ChangeRequestStatus.PENDING,
      date: new Date(),
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true as const };
}

export async function updateChangeRequestStatus(
  id: string,
  status: string,
  projectId: string
) {
  // Approving/rejecting a change request carries budget impact — restrict to finance writers
  await requireRole(FINANCE_WRITE_ROLES);
  await db.changeRequest.update({
    where: { id },
    data: {
      status: status as ChangeRequestStatus,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}

export async function seedChangeRequests(projectId: string) {
  const existing = await db.changeRequest.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  await db.changeRequest.createMany({
    data: [
      {
        projectId,
        description: "הרחבת חדר ממ״ד קומה ב׳ ב-2 מ״ר נוספים",
        requestedBy: "ישראל ישראלי",
        costImpact: 24000,
        scheduleImpact: 7,
        status: ChangeRequestStatus.APPROVED,
        date: new Date("2024-04-15"),
        approvedAt: new Date("2024-04-20"),
      },
      {
        projectId,
        description: "שינוי גמר קיר חיצוני מטיח לאבן ירושלמית",
        requestedBy: "שרה לוי",
        costImpact: 38000,
        scheduleImpact: 14,
        status: ChangeRequestStatus.PENDING,
        date: new Date("2024-07-01"),
      },
      {
        projectId,
        description: "הוספת ממ״ד שני בקומה ג׳",
        requestedBy: "ישראל ישראלי",
        costImpact: 72000,
        scheduleImpact: 21,
        status: ChangeRequestStatus.REJECTED,
        date: new Date("2024-05-10"),
      },
    ],
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
