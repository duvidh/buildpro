"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/session";
import { UserRole } from "@/generated/prisma/client";

export async function createCompany(
  name: string
): Promise<{ error: string } | void> {
  const session = await getSession();
  if (!session) return { error: "unauthorized" };
  const trimmed = name.trim();
  if (!trimmed) return { error: "name_required" };

  let companyId: string;
  try {
    const company = await db.company.create({ data: { name: trimmed } });
    companyId = company.id;
    await db.user.update({
      where: { id: session.userId },
      data: { companyId, role: UserRole.ADMIN },
    });
    // Re-issue the session so companyId + ADMIN role take effect immediately.
    await createSession({
      userId: session.userId,
      role: UserRole.ADMIN,
      name: session.name,
      email: session.email,
      companyId,
    });
  } catch (e) {
    console.error(
      "[createCompany] failed:",
      e instanceof Error ? e.message : e
    );
    return { error: "generic" };
  }
  redirect("/dashboard"); // outside try/catch — redirect throws internally
}
