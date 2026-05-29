/**
 * Role-Based Access Control helpers.
 * Import from server-side code only (Server Actions, Server Components, Route Handlers).
 */
import { getSession } from "@/lib/session";
import type { SessionUser } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | "ADMIN"
  | "OFFICE_MANAGER"
  | "PROJECT_MANAGER"
  | "FIELD_WORKER";

// ─── Permission Sets ──────────────────────────────────────────────────────────

/** Can view financial data (invoices, costs, summaries). */
export const FINANCE_VIEW_ROLES: UserRole[] = [
  "ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER",
];

/** Can write / modify financial records. */
export const FINANCE_WRITE_ROLES: UserRole[] = ["ADMIN", "OFFICE_MANAGER"];

/** Can delete any record. */
export const DELETE_ROLES: UserRole[] = ["ADMIN", "OFFICE_MANAGER"];

/** Can manage clients and leads. */
export const CLIENT_ROLES: UserRole[] = [
  "ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER",
];

/** Can create / update projects and related entities. */
export const PROJECT_ROLES: UserRole[] = [
  "ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER",
];

/** Full system administration. */
export const ADMIN_ROLES: UserRole[] = ["ADMIN"];

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Asserts the calling user is authenticated and holds one of `allowed` roles.
 * Throws `Error("Unauthorized access")` otherwise.
 *
 * Use this in Server Actions and Server Components that gate business data.
 */
export async function requireRole(allowed: UserRole[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session)                                  throw new Error("Unauthorized access");
  if (!allowed.includes(session.role as UserRole)) throw new Error("Unauthorized access");
  return session;
}

/**
 * Returns the current user's role, or null when not authenticated.
 * Never throws — safe for conditional branching.
 */
export async function getRole(): Promise<UserRole | null> {
  const session = await getSession();
  return session ? (session.role as UserRole) : null;
}

/**
 * Returns true if the current user holds one of `allowed` roles.
 * Never throws — safe for conditional branching.
 */
export async function hasRole(allowed: UserRole[]): Promise<boolean> {
  const role = await getRole();
  return role !== null && allowed.includes(role);
}
