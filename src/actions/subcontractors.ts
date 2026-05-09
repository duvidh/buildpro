"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { SupplierType } from "@/generated/prisma/client";

export async function getSubcontractors() {
  return db.supplier.findMany({
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
  await db.supplier.create({
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
