/**
 * Activity logging & notification helpers.
 * Plain async functions (NOT Server Actions) — import from server-side code only.
 *
 * ActivityLog.details is stored as JSON:
 *   { projectId: string | null, description: string }
 * The projectId is used to filter logs per project via a `contains` query.
 */
import { db } from "@/lib/db";
import { currentCompanyId } from "@/lib/tenant";

// ─── Activity log ─────────────────────────────────────────────────────────────

export type LogActivityInput = {
  userId?:      string | null;
  action:       string;       // e.g. "TASK_STATUS_CHANGED"
  entityType:   string;       // "TASK" | "PREFAB" | "FILE" | "PROJECT"
  entityId?:    string | null;
  projectId?:   string | null;
  description:  string;       // human-readable Hebrew
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const companyId = await currentCompanyId().catch(() => null);
    await db.activityLog.create({
      data: {
        companyId,
        userId:     input.userId     ?? null,
        action:     input.action,
        entityType: input.entityType,
        entityId:   input.entityId   ?? null,
        // Embed projectId inside the details JSON so we can filter per-project
        details: JSON.stringify({
          projectId:   input.projectId ?? null,
          description: input.description,
        }),
      },
    });
  } catch (err) {
    // Non-fatal — never let logging break a business action
    console.error("[logActivity]", err);
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type SendNotificationInput = {
  userId:       string;
  type:         string;
  title:        string;
  body?:        string | null;
  relatedId?:   string | null;
  relatedType?: string | null;
};

export async function sendNotification(input: SendNotificationInput): Promise<void> {
  try {
    const companyId = await currentCompanyId().catch(() => null);
    await db.notification.create({
      data: {
        companyId,
        userId:      input.userId,
        type:        input.type,
        title:       input.title,
        body:        input.body        ?? null,
        relatedId:   input.relatedId   ?? null,
        relatedType: input.relatedType ?? null,
      },
    });
  } catch (err) {
    console.error("[sendNotification]", err);
  }
}
