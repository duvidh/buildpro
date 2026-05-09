"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function seedWorkPackages(projectId: string) {
  const existing = await db.workPackage.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  await db.workPackage.createMany({
    data: [
      { projectId, name: "תכנון ורישוי", description: "אדריכלות, קונסטרוקציה ואישורי עירייה", plannedCost: 45000, actualCost: 43500, completionPercent: 100, startDate: new Date("2024-01-01"), endDate: new Date("2024-03-31"), order: 1 },
      { projectId, name: "עבודות עפר ויסוד", description: "חפירה, ניקוז ויציקת יסודות", plannedCost: 320000, actualCost: 307000, completionPercent: 100, startDate: new Date("2024-04-01"), endDate: new Date("2024-06-30"), order: 2 },
      { projectId, name: "שלד ובטון", description: "קומות א׳–ג׳ — ביצוע שלד, עמודים ותקרות", plannedCost: 480000, actualCost: 510000, completionPercent: 75, startDate: new Date("2024-07-01"), endDate: new Date("2024-12-31"), order: 3 },
      { projectId, name: "תשתיות חשמל וצנרת", description: "לוח ראשי, אינסטלציה, ביוב ואוורור", plannedCost: 120000, actualCost: 45000, completionPercent: 35, startDate: new Date("2024-09-01"), endDate: new Date("2025-02-28"), order: 4 },
      { projectId, name: "גמר פנים", description: "ריצוף, חיפוי, צביעה, גבס וארונות", plannedCost: 240000, actualCost: 80000, completionPercent: 30, startDate: new Date("2025-01-01"), endDate: new Date("2025-05-31"), order: 5 },
    ],
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}

export async function createWorkPackage(data: {
  projectId: string;
  name: string;
  description?: string;
  plannedCost?: number;
  startDate?: string;
  endDate?: string;
}) {
  const maxOrder = await db.workPackage.aggregate({
    where: { projectId: data.projectId },
    _max: { order: true },
  });
  await db.workPackage.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      description: data.description || null,
      plannedCost: data.plannedCost ?? 0,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true as const };
}
