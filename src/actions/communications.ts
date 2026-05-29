"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { CommunicationType } from "@/generated/prisma/client";

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCommunications(opts: {
  leadId?: string;
  clientId?: string;
}) {
  const { leadId, clientId } = opts;
  if (!leadId && !clientId) return [];

  return db.communicationLog.findMany({
    where: leadId ? { leadId } : { clientId: clientId! },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
    take: 100,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function addCommunicationLog(data: {
  type: CommunicationType;
  content: string;
  leadId?: string;
  clientId?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "נדרש להתחבר" };

  if (!data.content.trim()) {
    return { success: false as const, error: "תוכן הרשומה לא יכול להיות ריק" };
  }

  await db.communicationLog.create({
    data: {
      type: data.type,
      content: data.content.trim(),
      leadId:   data.leadId   ?? null,
      clientId: data.clientId ?? null,
      authorId: session.userId,
    },
  });

  if (data.leadId)   revalidatePath(`/leads/${data.leadId}/activity`);
  if (data.clientId) revalidatePath(`/clients/${data.clientId}/activity`);

  return { success: true as const };
}
