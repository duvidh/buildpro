"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { SupplierType } from "@/generated/prisma/client";
import { currentCompanyId } from "@/lib/tenant";

export async function getSubcontractors() {
  const cid = await currentCompanyId();
  return db.supplier.findMany({
    where: { companyId: cid },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contracts: true } },
    },
  });
}

export async function createSubcontractor(data: {
  name: string;
  type: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  const cid = await currentCompanyId();
  await db.supplier.create({
    data: {
      companyId: cid,
      name: data.name,
      type: data.type as SupplierType,
      contactName: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/subcontractors");
  return { success: true as const };
}

export async function updateSubcontractor(
  id: string,
  data: { name: string; type: string; contactName?: string; phone?: string; email?: string; address?: string; notes?: string }
) {
  const cid = await currentCompanyId();
  const owned = await db.supplier.findFirst({ where: { id, companyId: cid }, select: { id: true } });
  if (!owned) return { success: false as const };
  await db.supplier.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type as SupplierType,
      contactName: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/subcontractors");
  return { success: true as const };
}

export async function deleteSubcontractor(id: string) {
  try {
    const cid = await currentCompanyId();
    const owned = await db.supplier.findFirst({ where: { id, companyId: cid }, select: { id: true } });
    if (!owned) return { success: false as const, error: "לא ניתן למחוק ספק עם חוזים משויכים." };
    await db.supplier.delete({ where: { id } });
    revalidatePath("/subcontractors");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "לא ניתן למחוק ספק עם חוזים משויכים." };
  }
}

export async function updateSubcontractorRating(id: string, rating: number) {
  await db.supplier.update({ where: { id }, data: { rating } });
  revalidatePath("/subcontractors");
  return { success: true as const };
}

export async function toggleSubcontractorActive(id: string, active: boolean) {
  await db.supplier.update({ where: { id }, data: { active } });
  revalidatePath("/subcontractors");
  return { success: true as const };
}
