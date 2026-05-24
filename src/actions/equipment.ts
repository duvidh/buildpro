"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { EquipmentStatus } from "@/generated/prisma/client";

export async function getEquipmentWithProjects() {
  return db.equipment.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      logs: {
        where: { checkInDate: null },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { checkOutDate: "desc" },
        take: 1,
      },
    },
  });
}

export async function createEquipment(data: {
  name: string;
  code?: string;
  value?: number;
  purchaseDate?: string;
  notes?: string;
}) {
  try {
    await db.equipment.create({
      data: {
        name: data.name,
        code: data.code || null,
        value: data.value ?? null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        notes: data.notes || null,
        status: EquipmentStatus.AVAILABLE,
      },
    });
    revalidatePath("/equipment");
    return { success: true as const };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("code")) return { success: false as const, error: "קוד ציוד כבר קיים במערכת." };
    return { success: false as const, error: "שגיאה בהוספת הציוד." };
  }
}

export async function assignEquipmentToProject(
  equipmentId: string,
  projectId: string,
  notes?: string
) {
  await db.$transaction([
    db.equipmentLog.create({
      data: { equipmentId, projectId, checkOutDate: new Date(), notes: notes || null },
    }),
    db.equipment.update({
      where: { id: equipmentId },
      data: { status: EquipmentStatus.IN_USE, currentProjectId: projectId },
    }),
  ]);
  revalidatePath("/equipment");
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}

export async function unassignEquipment(equipmentId: string) {
  await db.$transaction(async (tx) => {
    const activeLog = await tx.equipmentLog.findFirst({
      where: { equipmentId, checkInDate: null },
    });

    if (activeLog) {
      await tx.equipmentLog.update({
        where: { id: activeLog.id },
        data: { checkInDate: new Date() },
      });
    }

    await tx.equipment.update({
      where: { id: equipmentId },
      data: { status: EquipmentStatus.AVAILABLE, currentProjectId: null },
    });
  });

  revalidatePath("/equipment");
  return { success: true as const };
}

export async function deleteEquipment(id: string) {
  try {
    await db.equipment.delete({ where: { id } });
    revalidatePath("/equipment");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "לא ניתן למחוק ציוד עם רשומות שיוך משויכות." };
  }
}

export async function updateEquipmentStatus(id: string, status: EquipmentStatus) {
  await db.equipment.update({ where: { id }, data: { status } });
  revalidatePath("/equipment");
  return { success: true as const };
}

export async function seedEquipmentData() {
  const count = await db.equipment.count();
  if (count > 0) return { success: true as const, skipped: true };

  await db.equipment.createMany({
    data: [
      { name: "מחפר CAT 320",          code: "EQ-001", status: EquipmentStatus.IN_USE,        value: 450000, purchaseDate: new Date("2021-06-01") },
      { name: "בובקט S650",             code: "EQ-002", status: EquipmentStatus.AVAILABLE,     value: 180000, purchaseDate: new Date("2022-03-15") },
      { name: "מנוף נייד 50T",          code: "EQ-003", status: EquipmentStatus.IN_USE,        value: 800000, purchaseDate: new Date("2019-11-20") },
      { name: "משאית שאיבת בטון",       code: "EQ-004", status: EquipmentStatus.MAINTENANCE,   value: 350000, purchaseDate: new Date("2020-07-10") },
      { name: "פיגומים קומפלט",         code: "EQ-005", status: EquipmentStatus.IN_USE,        value: 80000,  purchaseDate: new Date("2018-04-01") },
      { name: "גנרטור 100KVA",          code: "EQ-006", status: EquipmentStatus.AVAILABLE,     value: 95000,  purchaseDate: new Date("2023-01-05") },
      { name: "מיקסר בטון 8 מ\"ק",      code: "EQ-007", status: EquipmentStatus.AVAILABLE,     value: 220000, purchaseDate: new Date("2021-09-15") },
      { name: "רכב שטח טנדר",           code: "EQ-008", status: EquipmentStatus.IN_USE,        value: 140000, purchaseDate: new Date("2023-06-20") },
      { name: "קומפרסור אוויר",         code: "EQ-009", status: EquipmentStatus.AVAILABLE,     value: 35000,  purchaseDate: new Date("2022-11-01") },
      { name: "פורקליפט 3T",            code: "EQ-010", status: EquipmentStatus.MAINTENANCE,   value: 160000, purchaseDate: new Date("2020-02-28") },
    ],
  });

  return { success: true as const };
}
