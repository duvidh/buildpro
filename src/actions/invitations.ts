"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole, ADMIN_ROLES } from "@/lib/auth-utils";
import { getSession } from "@/lib/session";
import { sendInvitationEmail } from "@/lib/email";
import type { UserRole } from "@/generated/prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────────────

/** All pending (not yet accepted) invitations — Admin only. */
export async function getInvitations() {
  await requireRole(ADMIN_ROLES);
  return db.invitation.findMany({
    where:   { acceptedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id:        true,
      email:     true,
      role:      true,
      token:     true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { name: true } },
    },
  });
}

/** Validate a token without auth (used on the public accept page). */
export async function getInvitationByToken(token: string) {
  return db.invitation.findUnique({
    where:  { token },
    select: { id: true, email: true, role: true, expiresAt: true, acceptedAt: true },
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function inviteUser(email: string, role: UserRole) {
  const session = await requireRole(ADMIN_ROLES);

  const normalised = email.trim().toLowerCase();

  // Block if a user with that email already exists
  const existing = await db.user.findUnique({ where: { email: normalised } });
  if (existing) return { error: "user_exists" as const };

  // Cancel any previous pending invitation for the same address
  await db.invitation.deleteMany({ where: { email: normalised, acceptedAt: null } });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await db.invitation.create({
    data: { email: normalised, role, expiresAt, invitedById: session.userId },
  });

  try {
    await sendInvitationEmail({
      to:          normalised,
      inviterName: session.name,
      role,
      token:       invitation.token,
    });
  } catch (err) {
    // Don't fail the whole operation if email sending fails — log and continue
    console.error("[inviteUser] email send failed:", err instanceof Error ? err.message : err);
  }

  revalidatePath("/settings");
  return { success: true as const, invitation };
}

export async function cancelInvitation(id: string) {
  await requireRole(ADMIN_ROLES);
  try {
    await db.invitation.delete({ where: { id } });
  } catch {
    // Record may have already been deleted — treat as success
  }
  revalidatePath("/settings");
  return { success: true as const };
}

export async function resendInvitation(id: string) {
  const session = await requireRole(ADMIN_ROLES);

  const invitation = await db.invitation.findUnique({ where: { id } });
  if (!invitation || invitation.acceptedAt) return { error: "not_found" as const };

  // Extend expiry by another 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.invitation.update({ where: { id }, data: { expiresAt } });

  try {
    await sendInvitationEmail({
      to:          invitation.email,
      inviterName: session.name,
      role:        invitation.role,
      token:       invitation.token,
    });
  } catch (err) {
    console.error("[resendInvitation] email send failed:", err instanceof Error ? err.message : err);
    return { error: "email_failed" as const };
  }

  return { success: true as const };
}

// ─── Accept (public — no session required) ────────────────────────────────────

export async function acceptInvitation(
  token: string,
  name: string,
  password: string
): Promise<{ success: true } | { error: string }> {
  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation)              return { error: "invalid_token" };
  if (invitation.acceptedAt)   return { error: "already_accepted" };
  if (invitation.expiresAt < new Date()) return { error: "expired" };

  // Guard: user may have been created between page load and form submit
  const clash = await db.user.findUnique({ where: { email: invitation.email } });
  if (clash) return { error: "user_exists" };

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      email:        invitation.email,
      name:         name.trim(),
      passwordHash,
      role:         invitation.role,
      active:       true,
    },
  });

  await db.invitation.update({
    where: { token },
    data:  { acceptedAt: new Date() },
  });

  return { success: true };
}
