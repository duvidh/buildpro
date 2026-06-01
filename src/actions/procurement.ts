"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ContractStatus, SupplierType } from "@/generated/prisma/client";
import { currentCompanyId } from "@/lib/tenant";

export async function createProjectContract(data: {
  projectId: string;
  supplierId: string;
  description?: string;
  value: number;
  startDate?: string;
  endDate?: string;
  retentionPercent?: number;
}) {
  const cid = await currentCompanyId();
  await db.contract.create({
    data: {
      companyId: cid,
      projectId: data.projectId,
      supplierId: data.supplierId,
      description: data.description || null,
      value: data.value,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      retentionPercent: data.retentionPercent ?? 0,
      status: ContractStatus.DRAFT,
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true as const };
}

export async function seedProcurement(projectId: string) {
  const cid = await currentCompanyId().catch(() => null);
  if (cid) return { success: true as const, skipped: true };
  const existing = await db.contract.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  const ensureSupplier = async (name: string, type: SupplierType, phone: string, rating: number) => {
    const found = await db.supplier.findFirst({ where: { name } });
    if (found) return found;
    return db.supplier.create({ data: { name, type, phone, rating, active: true } });
  };

  const [s1, s2, s3] = await Promise.all([
    ensureSupplier("גולן קבלן שלד", SupplierType.SUBCONTRACTOR, "04-1234567", 4),
    ensureSupplier("ספקי בטון מרכז", SupplierType.SUPPLIER, "08-9876543", 5),
    ensureSupplier("חשמל ותשתיות כרמל", SupplierType.SUBCONTRACTOR, "04-5566778", 3),
  ]);

  await db.contract.createMany({
    data: [
      {
        projectId,
        supplierId: s1.id,
        description: "שלד ובטון — ביצוע קומות א׳–ג׳",
        value: 480000,
        paidAmount: 240000,
        status: ContractStatus.ACTIVE,
        retentionPercent: 5,
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-12-31"),
      },
      {
        projectId,
        supplierId: s2.id,
        description: "אספקת בטון מוכן C30/37 — כ-800 מ״ק",
        value: 95000,
        paidAmount: 95000,
        status: ContractStatus.COMPLETED,
        retentionPercent: 0,
        startDate: new Date("2024-05-01"),
        endDate: new Date("2024-08-31"),
      },
      {
        projectId,
        supplierId: s3.id,
        description: "עבודות חשמל — לוח ראשי, חלוקה ועמדות",
        value: 140000,
        paidAmount: 35000,
        status: ContractStatus.ACTIVE,
        retentionPercent: 7,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-02-28"),
      },
    ],
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}

export async function createContractSimple(data: {
  projectId: string;
  supplierName: string;
  supplierType: "SUPPLIER" | "SUBCONTRACTOR";
  description?: string;
  value: number;
  retentionPercent?: number;
}) {
  const cid = await currentCompanyId();
  const existing = await db.supplier.findFirst({ where: { name: data.supplierName, companyId: cid } });
  const supplier =
    existing ??
    (await db.supplier.create({
      data: { companyId: cid, name: data.supplierName, type: data.supplierType as SupplierType, active: true },
    }));

  await db.contract.create({
    data: {
      companyId: cid,
      projectId: data.projectId,
      supplierId: supplier.id,
      description: data.description || null,
      value: data.value,
      retentionPercent: data.retentionPercent ?? 0,
      status: ContractStatus.DRAFT,
    },
  });

  revalidatePath(`/projects/${data.projectId}`);
  return { success: true as const };
}
