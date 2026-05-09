"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { QCResult, NCRSeverity, NCRStatus } from "@/generated/prisma/client";

export async function createQualityCheck(data: {
  projectId: string;
  type: string;
  result: string;
  inspector?: string;
  notes?: string;
}) {
  await db.qualityCheck.create({
    data: {
      projectId: data.projectId,
      type: data.type,
      result: data.result as QCResult,
      inspector: data.inspector || null,
      notes: data.notes || null,
      date: new Date(),
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true as const };
}

export async function createNCR(data: {
  projectId: string;
  description: string;
  severity: string;
  assignedTo?: string;
}) {
  await db.nCR.create({
    data: {
      projectId: data.projectId,
      description: data.description,
      severity: data.severity as NCRSeverity,
      status: NCRStatus.OPEN,
      assignedTo: data.assignedTo || null,
      date: new Date(),
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true as const };
}

export async function updateNCRStatus(id: string, status: NCRStatus, projectId: string) {
  await db.nCR.update({ where: { id }, data: { status, closedAt: status === NCRStatus.CLOSED ? new Date() : null } });
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}

export async function seedQualityData(projectId: string) {
  const existing = await db.qualityCheck.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  await db.qualityCheck.createMany({
    data: [
      { projectId, type: "יציקת בטון — תקרת קומה א׳", result: QCResult.PASS, inspector: "מהנדס רוני פרץ", notes: "בטון 30 MPa — עבר תקן ישראלי 1152", date: new Date("2024-05-10") },
      { projectId, type: "ריתוך עמודי פלדה — גוש A", result: QCResult.PASS, inspector: "מהנדס גיל כהן", notes: "כל 14 עמודים — ריתוך תקין", date: new Date("2024-06-02") },
      { projectId, type: "מבחן לחץ מערכת צנרת — 8 בר", result: QCResult.FAIL, inspector: "מפקח עיריה", notes: "דליפה בגוש B — נדרש תיקון", date: new Date("2024-07-15") },
      { projectId, type: "בדיקת ריצוף לובי כניסה", result: QCResult.PENDING, inspector: null, notes: null, date: new Date() },
    ],
  });

  await db.nCR.createMany({
    data: [
      { projectId, description: "חריגה בעובי בטון — עמוד A3: 18 ס״מ במקום 22 ס״מ", severity: NCRSeverity.HIGH, status: NCRStatus.IN_PROGRESS, assignedTo: "אריה שפירא", date: new Date("2024-07-20") },
      { projectId, description: "ריצוף לא ישר בלובי — חריגה של 3 מ״מ", severity: NCRSeverity.LOW, status: NCRStatus.CLOSED, resolution: "הוסר ורוצף מחדש", date: new Date("2024-06-10") },
    ],
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
