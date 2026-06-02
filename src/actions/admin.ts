"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/super-admin";
import { UserRole } from "@/generated/prisma/client";

/**
 * Platform-owner (super-admin) actions. Every function is gated by
 * requireSuperAdmin() — they deliberately read ACROSS all tenants, which is
 * exactly what the normal per-company scoping forbids. Only the hard-coded
 * SUPER_ADMIN_EMAIL can reach them.
 */

export async function getAllCompanies() {
  await requireSuperAdmin();
  const companies = await db.company.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true, projects: true, clients: true } },
    },
  });
  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    userCount: c._count.users,
    projectCount: c._count.projects,
    clientCount: c._count.clients,
  }));
}

/** Users with no company yet (signed up via Google but haven't onboarded). */
export async function getUnassignedUsers() {
  await requireSuperAdmin();
  return db.user.findMany({
    where: { companyId: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      authProvider: true,
      active: true,
      createdAt: true,
    },
  });
}

/** All users of one company (super-admin view of any tenant). */
export async function getCompanyUsersAdmin(companyId: string) {
  await requireSuperAdmin();
  return db.user.findMany({
    where: { companyId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      authProvider: true,
      active: true,
      createdAt: true,
    },
  });
}

/** Platform-wide totals for the console header. */
export async function getPlatformStats() {
  await requireSuperAdmin();
  const [companies, users, activeUsers, unassigned] = await Promise.all([
    db.company.count(),
    db.user.count(),
    db.user.count({ where: { active: true } }),
    db.user.count({ where: { companyId: null } }),
  ]);
  return { companies, users, activeUsers, unassigned };
}

/** Activate / deactivate any user across the whole platform. */
export async function setUserActiveAdmin(userId: string, active: boolean) {
  await requireSuperAdmin();
  await db.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin");
  return { success: true as const };
}

/** Change any user's role across the whole platform. */
export async function setUserRoleAdmin(userId: string, role: UserRole) {
  await requireSuperAdmin();
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return { success: true as const };
}
