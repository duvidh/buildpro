import { db } from "@/lib/db";

/** Hard cap on AI assistant queries per company (SaaS quota model, phase 1). */
export const AI_QUERY_LIMIT = 100;

/**
 * Atomically consume one AI query for the company.
 * Returns false when the quota is already exhausted (nothing is consumed).
 *
 * Two steps: ensure the row exists, then a guarded increment
 * (`count < limit`) so concurrent requests can never push past the cap.
 */
export async function consumeAiQuery(companyId: string): Promise<boolean> {
  await db.aiUsage.upsert({
    where: { companyId },
    create: { companyId, count: 0 },
    update: {},
  });

  const res = await db.aiUsage.updateMany({
    where: { companyId, count: { lt: AI_QUERY_LIMIT } },
    data: { count: { increment: 1 } },
  });
  return res.count > 0;
}
