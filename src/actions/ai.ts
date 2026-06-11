"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AI_QUERY_LIMIT } from "@/lib/ai-quota";

/** Which entity the assistant panel is anchored to (derived from the URL). */
export type AIContext = "project" | "client" | "generic";

export type AiQuota = {
  used: number;
  limit: number;
  remaining: number;
};

/** Current company's AI usage for the quota counter in the UI. */
export async function getAiQuota(): Promise<AiQuota> {
  const session = await getSession();
  const cid = session?.companyId;
  // No company context (legacy account / logged out): treat as exhausted.
  if (!cid) return { used: AI_QUERY_LIMIT, limit: AI_QUERY_LIMIT, remaining: 0 };

  const usage = await db.aiUsage.findUnique({
    where: { companyId: cid },
    select: { count: true },
  });

  const used = Math.min(usage?.count ?? 0, AI_QUERY_LIMIT);
  return { used, limit: AI_QUERY_LIMIT, remaining: AI_QUERY_LIMIT - used };
}
