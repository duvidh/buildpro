"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { UserRole } from "@/generated/prisma/client";

export async function getUsers() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      active: true,
      createdAt: true,
    },
  });
}

export async function getCurrentUser() {
  const { getSession } = await import("@/lib/session");
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      active: true,
    },
  });
}

export async function updateUserRole(id: string, role: UserRole) {
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings");
  return { success: true as const };
}

export async function toggleUserActive(id: string, active: boolean) {
  await db.user.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
  return { success: true as const };
}

export async function updateCurrentUserProfile(data: {
  id: string;
  name: string;
  email: string;
  phone?: string;
}) {
  await db.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
    },
  });
  revalidatePath("/profile");
  revalidatePath("/settings");
  return { success: true as const };
}

export async function seedUsers() {
  const count = await db.user.count();
  if (count > 0) return { success: true as const, skipped: true };

  // Hash passwords with bcrypt (cost 10) — never store plain text
  const [adminHash, uriHash, saritHash, davidHash, noaHash] = await Promise.all([
    bcrypt.hash("Admin@123", 10),
    bcrypt.hash("Uri@123", 10),
    bcrypt.hash("Sarit@123", 10),
    bcrypt.hash("David@123", 10),
    bcrypt.hash("Noa@123", 10),
  ]);

  await db.user.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "מנהל מערכת",
        email: "admin@buildpro.co.il",
        passwordHash: adminHash,
        role: UserRole.ADMIN,
        phone: "03-1234567",
        active: true,
      },
      {
        name: "אורי בן-דוד",
        email: "uri@buildpro.co.il",
        passwordHash: uriHash,
        role: UserRole.PROJECT_MANAGER,
        phone: "050-9876543",
        active: true,
      },
      {
        name: "שרית כהן",
        email: "sarit@buildpro.co.il",
        passwordHash: saritHash,
        role: UserRole.OFFICE_MANAGER,
        phone: "052-1122334",
        active: true,
      },
      {
        name: "דוד לוי",
        email: "david@buildpro.co.il",
        passwordHash: davidHash,
        role: UserRole.FIELD_WORKER,
        phone: "054-6677889",
        active: true,
      },
      {
        name: "נועה אברהם",
        email: "noa@buildpro.co.il",
        passwordHash: noaHash,
        role: UserRole.PROJECT_MANAGER,
        phone: "053-4455667",
        active: true,
      },
    ],
  });

  return { success: true as const };
}
