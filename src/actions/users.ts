"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { UserRole } from "@/generated/prisma/client";
import { requireRole, ADMIN_ROLES } from "@/lib/auth-utils";
import { getSession } from "@/lib/session";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { sendCredentialsEmail } from "@/lib/email";
import { currentCompanyId } from "@/lib/tenant";

export async function getUsers() {
  const session = await getSession();
  if (!session?.companyId) return [];
  return db.user.findMany({
    where: { companyId: session.companyId },
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

export async function saveDashboardLayout(layout: unknown) {
  const { getSession } = await import("@/lib/session");
  const session = await getSession();
  if (!session) return { success: false as const, error: "לא מחובר" };
  await db.user.update({
    where: { id: session.userId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { dashboardLayout: layout as any },
  });
  return { success: true as const };
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
  const session = await requireRole(ADMIN_ROLES);
  const target = await db.user.findUnique({ where: { id }, select: { companyId: true } });
  if (!target || target.companyId !== session.companyId)
    return { success: false as const, error: "not_found" as const };
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings");
  return { success: true as const };
}

export async function toggleUserActive(id: string, active: boolean) {
  const session = await requireRole(ADMIN_ROLES);
  const target = await db.user.findUnique({ where: { id }, select: { companyId: true } });
  if (!target || target.companyId !== session.companyId)
    return { success: false as const, error: "not_found" as const };
  await db.user.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
  return { success: true as const };
}

export async function updateCurrentUserProfile(data: {
  name: string;
  email: string;
  phone?: string;
}) {
  // Scope to the authenticated user — never trust a client-supplied id
  const session = await getSession();
  if (!session) throw new Error("Unauthorized access");

  await db.user.update({
    where: { id: session.userId },
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

export async function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}) {
  const session = await requireRole(ADMIN_ROLES);
  if (!session.companyId) return { success: false as const, error: "no_company" as const };
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!name || !email) return { success: false as const, error: "invalid" as const };
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { success: false as const, error: "user_exists" as const };
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const user = await db.user.create({
    data: {
      name,
      email,
      role: data.role,
      phone: data.phone?.trim() || null,
      passwordHash,
      active: true,
      companyId: session.companyId,
    },
  });
  let emailSent = true;
  try {
    await sendCredentialsEmail({
      to: email,
      name,
      tempPassword: DEFAULT_PASSWORD,
      role: data.role,
    });
  } catch (err) {
    emailSent = false;
    console.error(
      "[createUser] credentials email failed:",
      err instanceof Error ? err.message : err
    );
  }
  revalidatePath("/settings");
  return {
    success: true as const,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      active: user.active,
      createdAt: user.createdAt,
    },
    emailSent,
  };
}

export async function updateUser(
  id: string,
  data: { name: string; email: string; role: UserRole; phone?: string }
) {
  const session = await requireRole(ADMIN_ROLES);
  const target = await db.user.findUnique({ where: { id }, select: { companyId: true } });
  if (!target || target.companyId !== session.companyId)
    return { success: false as const, error: "not_found" as const };
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!name || !email) return { success: false as const, error: "invalid" as const };
  const clash = await db.user.findFirst({ where: { email, NOT: { id } } });
  if (clash) return { success: false as const, error: "user_exists" as const };
  await db.user.update({
    where: { id },
    data: { name, email, role: data.role, phone: data.phone?.trim() || null },
  });
  revalidatePath("/settings");
  return { success: true as const };
}

export async function resetUserPassword(id: string) {
  const session = await requireRole(ADMIN_ROLES);
  const target = await db.user.findUnique({ where: { id }, select: { companyId: true } });
  if (!target || target.companyId !== session.companyId)
    return { success: false as const, tempPassword: "" };
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  await db.user.update({ where: { id }, data: { passwordHash } });
  revalidatePath("/settings");
  return { success: true as const, tempPassword: DEFAULT_PASSWORD };
}

export async function deleteUser(id: string) {
  const session = await requireRole(ADMIN_ROLES);
  if (session.userId === id) return { success: false as const, error: "self" as const };
  const counts = await db.user.findUnique({
    where: { id, companyId: session.companyId },
    select: {
      _count: {
        select: {
          managedProjects: true,
          assignedTasks: true,
          assignedLeads: true,
          projectMembers: true,
          uploadedFiles: true,
        },
      },
    },
  });
  if (!counts) return { success: false as const, error: "not_found" as const };
  const c = counts._count;
  const hasData =
    c.managedProjects +
      c.assignedTasks +
      c.assignedLeads +
      c.projectMembers +
      c.uploadedFiles >
    0;
  if (hasData) return { success: false as const, error: "has_data" as const };
  await db.user.delete({ where: { id } });
  revalidatePath("/settings");
  return { success: true as const };
}

// ─── Employees (company-scoped, Google pre-registration) ──────────────────────

export async function getCompanyUsers() {
  const session = await requireRole(ADMIN_ROLES);
  if (!session.companyId) return [];
  return db.user.findMany({
    where: { companyId: session.companyId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      active: true,
      authProvider: true,
      companyId: true,
      createdAt: true,
    },
  });
}

export async function inviteEmployee(data: {
  name: string;
  email: string;
  role: UserRole;
}) {
  const session = await requireRole(ADMIN_ROLES);
  if (!session.companyId) return { success: false as const, error: "no_company" as const };
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!name || !email) return { success: false as const, error: "invalid" as const };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { success: false as const, error: "invalid_email" as const };
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { success: false as const, error: "user_exists" as const };
  const user = await db.user.create({
    data: {
      name,
      email,
      role: data.role,
      passwordHash: null, // Google-login only (pre-registration)
      authProvider: null, // set to "google" on first actual Google login
      active: true,
      companyId: session.companyId,
    },
  });
  revalidatePath("/employees");
  return {
    success: true as const,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      active: user.active,
      authProvider: user.authProvider,
      companyId: user.companyId,
      createdAt: user.createdAt,
    },
  };
}

export async function setEmployeeRole(id: string, role: UserRole) {
  const session = await requireRole(ADMIN_ROLES);
  const target = await db.user.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!target || target.companyId !== session.companyId)
    return { success: false as const, error: "not_found" as const };
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/employees");
  return { success: true as const };
}

export async function removeEmployee(id: string) {
  const session = await requireRole(ADMIN_ROLES);
  if (session.userId === id) return { success: false as const, error: "self" as const };
  const target = await db.user.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!target || target.companyId !== session.companyId)
    return { success: false as const, error: "not_found" as const };
  // Deactivate rather than delete — preserves FK integrity and matches
  // the existing toggleUserActive philosophy.
  await db.user.update({ where: { id }, data: { active: false } });
  revalidatePath("/employees");
  return { success: true as const };
}

export async function seedUsers() {
  const cid = await currentCompanyId().catch(() => null);
  if (cid) return { success: true as const, skipped: true };
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
