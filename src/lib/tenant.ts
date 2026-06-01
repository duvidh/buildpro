import { getSession } from "@/lib/session";

/** Returns the current user's companyId (may be null for legacy accounts). Throws if unauthenticated. */
export async function currentCompanyId(): Promise<string | null> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized access");
  return session.companyId ?? null;
}
