import { getSession } from "@/lib/session";

/**
 * The single platform-owner account. Only this email may access the
 * cross-tenant super-admin console (/admin). It is intentionally a hard-coded
 * constant (not a DB role) so it can never be granted by mistake through the
 * normal admin UI.
 */
export const SUPER_ADMIN_EMAIL = "systembuildpro@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

/** True when the current session belongs to the platform owner. Never throws. */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  return isSuperAdminEmail(session?.email);
}

/** Asserts super-admin; throws "Unauthorized access" otherwise. Use in actions. */
export async function requireSuperAdmin(): Promise<void> {
  if (!(await isSuperAdmin())) throw new Error("Unauthorized access");
}
