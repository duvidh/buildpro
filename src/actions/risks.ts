"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { RiskStatus } from "@/generated/prisma/client";

export async function createRisk(data: {
  projectId: string;
  description: string;
  probability: number;
  impact: number;
  mitigation?: string;
}) {
  await db.risk.create({
    data: {
      projectId: data.projectId,
      description: data.description,
      probability: data.probability,
      impact: data.impact,
      mitigation: data.mitigation || null,
      status: RiskStatus.OPEN,
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true as const };
}

export async function updateRiskStatus(id: string, status: string, projectId: string) {
  await db.risk.update({ where: { id }, data: { status: status as RiskStatus } });
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}

export async function seedRisks(projectId: string) {
  const existing = await db.risk.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  await db.risk.createMany({
    data: [
      { projectId, description: "עיכוב בקבלת פלדה עקב שביתת נמל אשדוד", probability: 4, impact: 4, mitigation: "הזמנה מראש ב-2 ספקים חלופיים — חוזה מסגרת שנתי", status: RiskStatus.OPEN },
      { projectId, description: "תנאי מזג אוויר קיצוניים — חורף 2025", probability: 3, impact: 2, mitigation: "ריפוד 14 יום מובנה בלו״ז — מחסן לחומרים רגישים", status: RiskStatus.MITIGATED },
      { projectId, description: "שינוי דרישות לקוח לאחר תחילת ביצוע", probability: 2, impact: 5, mitigation: "חוזה עם סעיף שינויים — כל שינוי בכתב ומאושר", status: RiskStatus.OPEN },
      { projectId, description: "מחסור בעובדי מקצוע — מרצפים ורצפים", probability: 3, impact: 3, mitigation: "קבלן משנה ממתין חתם על זמינות", status: RiskStatus.CLOSED },
    ],
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
