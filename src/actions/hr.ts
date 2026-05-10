"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function getEmployees() {
  return db.employee.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { timeEntries: true } },
    },
  });
}

export async function createEmployee(data: {
  name: string;
  trade?: string;
  phone?: string;
  idNumber?: string;
  hourlyRate?: number;
  startDate?: string;
}) {
  try {
    await db.employee.create({
      data: {
        name: data.name,
        trade: data.trade || null,
        phone: data.phone || null,
        idNumber: data.idNumber || null,
        hourlyRate: data.hourlyRate ?? 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
      },
    });
    revalidatePath("/hr");
    return { success: true as const };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "שגיאה";
    if (msg.includes("idNumber")) return { success: false as const, error: "מספר ת.ז כבר קיים במערכת." };
    return { success: false as const, error: "שגיאה ביצירת העובד." };
  }
}

export async function updateEmployee(
  id: string,
  data: { name: string; trade?: string; phone?: string; idNumber?: string; hourlyRate?: number }
) {
  try {
    await db.employee.update({
      where: { id },
      data: {
        name: data.name,
        trade: data.trade || null,
        phone: data.phone || null,
        idNumber: data.idNumber || null,
        hourlyRate: data.hourlyRate ?? 0,
      },
    });
    revalidatePath("/hr");
    return { success: true as const };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "שגיאה";
    if (msg.includes("idNumber")) return { success: false as const, error: "מספר ת.ז כבר קיים במערכת." };
    return { success: false as const, error: "שגיאה בעדכון העובד." };
  }
}

export async function deleteEmployee(id: string) {
  try {
    await db.employee.delete({ where: { id } });
    revalidatePath("/hr");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "לא ניתן למחוק עובד עם נתונים משויכים." };
  }
}

export async function toggleEmployeeActive(id: string, active: boolean) {
  await db.employee.update({ where: { id }, data: { active } });
  revalidatePath("/hr");
  return { success: true as const };
}

export async function seedHRData() {
  const count = await db.employee.count();
  if (count > 0) return { success: true as const, skipped: true };

  await db.employee.createMany({
    data: [
      { name: "יוסף לוי",      trade: "מנהל עבודה",    phone: "050-1234567", hourlyRate: 120, startDate: new Date("2021-03-15") },
      { name: "מוחמד עבאס",    trade: "מנופאי",         phone: "052-7654321", hourlyRate: 150, startDate: new Date("2019-07-01") },
      { name: "שלמה כהן",      trade: "רצף",            phone: "054-9876543", hourlyRate: 90,  startDate: new Date("2022-01-10") },
      { name: "ג׳מאל חסן",     trade: "חשמלאי",         phone: "053-1122334", hourlyRate: 110, startDate: new Date("2023-05-20") },
      { name: "רוני פרץ",      trade: "אינסטלטור",      phone: "050-9988776", hourlyRate: 100, startDate: new Date("2020-11-01") },
      { name: "אלי אברהם",     trade: "טכנאי גבס",      phone: "052-3344556", hourlyRate: 85,  startDate: new Date("2018-06-15") },
      { name: "מאמד ג׳בארין",  trade: "כפיסאי",         phone: "054-6677889", hourlyRate: 80,  startDate: new Date("2022-09-01") },
      { name: "אריה שפירא",    trade: "מנהל בטיחות",   phone: "053-9900112", hourlyRate: 130, startDate: new Date("2020-02-01") },
      { name: "דוד אוחיון",    trade: "צבעי",           phone: "050-5566778", hourlyRate: 78,  startDate: new Date("2024-01-15") },
      { name: "נאסר חמדאן",   trade: "עובד כללי",      phone: "052-8877665", hourlyRate: 65,  startDate: new Date("2023-08-01") },
    ],
  });

  return { success: true as const };
}
