"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CLIENT_ROLES, ownerScopeUserId, type UserRole } from "@/lib/auth-utils";
import { currentCompanyId } from "@/lib/tenant";

export type SearchResult = {
  type: "project" | "client" | "task";
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
};

const MAX_PER_TYPE = 5;

/**
 * Header global search across projects, clients and tasks.
 * Tenant-scoped, and mirrors the app's RBAC: clients only for CLIENT_ROLES,
 * SALES users see only their own projects.
 */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const session = await getSession();
  if (!session) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const cid = await currentCompanyId();
    const role = session.role as UserRole;
    const ownerId = await ownerScopeUserId();
    const canSearchClients = CLIENT_ROLES.includes(role);

    const [projects, clients, tasks] = await Promise.all([
      db.project.findMany({
        where: {
          companyId: cid,
          ...(ownerId ? { managerId: ownerId } : {}),
          name: { contains: q, mode: "insensitive" },
        },
        take: MAX_PER_TYPE,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, client: { select: { name: true } } },
      }),
      canSearchClients
        ? db.client.findMany({
            where: {
              companyId: cid,
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            take: MAX_PER_TYPE,
            orderBy: { updatedAt: "desc" },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      db.task.findMany({
        where: {
          companyId: cid,
          name: { contains: q, mode: "insensitive" },
        },
        take: MAX_PER_TYPE,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          projectId: true,
          project: { select: { name: true } },
        },
      }),
    ]);

    return [
      ...projects.map((p): SearchResult => ({
        type: "project",
        id: p.id,
        title: p.name,
        subtitle: p.client?.name ?? null,
        url: `/projects/${p.id}`,
      })),
      ...clients.map((c): SearchResult => ({
        type: "client",
        id: c.id,
        title: c.name,
        subtitle: c.email,
        url: `/clients/${c.id}`,
      })),
      ...tasks.map((t): SearchResult => ({
        type: "task",
        id: t.id,
        title: t.name,
        subtitle: t.project?.name ?? null,
        url: t.projectId ? `/projects/${t.projectId}/tasks` : "/tasks",
      })),
    ];
  } catch (e) {
    console.error("[globalSearch] failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
