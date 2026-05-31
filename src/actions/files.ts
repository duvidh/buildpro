"use server";

import { revalidatePath } from "next/cache";
import { uploadToStorage, deleteFromStorage } from "@/lib/supabase-storage";
import { db } from "@/lib/db";
import type { FileCategory } from "@/generated/prisma/client";
import { getSession } from "@/lib/session";
import { logActivity, sendNotification } from "@/lib/activity";

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjectFiles(projectId: string) {
  return db.projectFile.findMany({
    where:   { projectId },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage and record it in the database.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, plus a public
 * "uploads" bucket. Server Actions stream files up to the configured
 * bodySizeLimit (default 4.5 MB; raise via next.config serverActions.bodySizeLimit).
 */
export async function uploadProjectFile(projectId: string, formData: FormData) {
  const file        = formData.get("file");
  const rawCategory = formData.get("category") as string | null;

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "קובץ לא תקין או ריק" };
  }

  const validCategories: FileCategory[] = [
    "PLANS", "CONTRACTS", "PERMITS", "PHOTOS", "OTHER",
  ];
  const category: FileCategory =
    rawCategory && validCategories.includes(rawCategory as FileCategory)
      ? (rawCategory as FileCategory)
      : "OTHER";

  // Unique path avoids collisions across projects / re-uploads
  const storagePath = `projects/${projectId}/${Date.now()}-${file.name}`;

  let blobUrl: string;
  try {
    blobUrl = await uploadToStorage(storagePath, file);
  } catch (err) {
    console.error("[uploadProjectFile] Supabase storage upload failed:", err);
    return {
      success: false as const,
      error: "שגיאה בהעלאת הקובץ לאחסון. ודא שהסביבה מוגדרת עם Supabase Storage.",
    };
  }

  const session   = await getSession();
  const actorId   = session?.userId ?? null;
  const actorName = session?.name   ?? "מישהו";

  const newFile = await db.projectFile.create({
    data: {
      projectId,
      name:          file.name,
      url:           blobUrl,
      fileType:      file.type || null,
      sizeBytes:     file.size,
      category,
      uploadedById:  actorId ?? undefined,
    },
  });

  // Log the upload
  await logActivity({
    userId:      actorId,
    action:      "FILE_UPLOADED",
    entityType:  "FILE",
    entityId:    newFile.id,
    projectId,
    description: `${actorName} העלה קובץ "${file.name}"`,
  });

  // Notify project manager
  const project = await db.project.findUnique({
    where:  { id: projectId },
    select: { managerId: true },
  });
  const managerId = project?.managerId ?? null;
  if (managerId && managerId !== actorId) {
    await sendNotification({
      userId:      managerId,
      type:        "FILE_UPLOADED",
      title:       `📄 קובץ חדש הועלה לפרויקט`,
      body:        `"${file.name}" הועלה על ידי ${actorName}`,
      relatedId:   newFile.id,
      relatedType: "FILE",
    });
  }

  revalidatePath(`/projects/${projectId}/files`);
  revalidatePath(`/projects/${projectId}`);        // refresh header file count
  return { success: true as const };
}

// ─── CRM Queries ─────────────────────────────────────────────────────────────

export async function getCrmFiles(opts: { leadId?: string; clientId?: string }) {
  const { leadId, clientId } = opts;
  if (!leadId && !clientId) return [];
  return db.projectFile.findMany({
    where:   leadId ? { leadId } : { clientId: clientId! },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
}

// ─── CRM Upload ───────────────────────────────────────────────────────────────

export async function uploadCrmFile(
  opts: { leadId?: string; clientId?: string },
  formData: FormData,
) {
  const file        = formData.get("file");
  const rawCategory = formData.get("category") as string | null;

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "קובץ לא תקין או ריק" };
  }

  const validCategories: FileCategory[] = [
    "PLANS", "CONTRACTS", "PERMITS", "PHOTOS", "OTHER",
  ];
  const category: FileCategory =
    rawCategory && validCategories.includes(rawCategory as FileCategory)
      ? (rawCategory as FileCategory)
      : "OTHER";

  const prefix = opts.leadId ? `leads/${opts.leadId}` : `clients/${opts.clientId}`;
  const storagePath = `${prefix}/${Date.now()}-${file.name}`;

  let blobUrl: string;
  try {
    blobUrl = await uploadToStorage(storagePath, file);
  } catch (err) {
    console.error("[uploadCrmFile] Supabase storage upload failed:", err);
    return {
      success: false as const,
      error: "שגיאה בהעלאת הקובץ לאחסון. ודא שהסביבה מוגדרת עם Supabase Storage.",
    };
  }

  const session = await getSession();
  const actorId = session?.userId ?? null;

  await db.projectFile.create({
    data: {
      leadId:       opts.leadId   ?? null,
      clientId:     opts.clientId ?? null,
      name:         file.name,
      url:          blobUrl,
      fileType:     file.type || null,
      sizeBytes:    file.size,
      category,
      uploadedById: actorId ?? undefined,
    },
  });

  if (opts.leadId)   revalidatePath(`/leads/${opts.leadId}/files`);
  if (opts.clientId) revalidatePath(`/clients/${opts.clientId}/files`);

  return { success: true as const };
}

// ─── CRM Delete ───────────────────────────────────────────────────────────────

export async function deleteCrmFile(
  fileId: string,
  opts: { leadId?: string; clientId?: string },
) {
  const file = await db.projectFile.findUnique({ where: { id: fileId } });
  if (!file) return { success: false as const, error: "קובץ לא נמצא" };

  try { await deleteFromStorage(file.url); } catch { /* storage deletion is non-fatal */ }

  await db.projectFile.delete({ where: { id: fileId } });

  if (opts.leadId)   revalidatePath(`/leads/${opts.leadId}/files`);
  if (opts.clientId) revalidatePath(`/clients/${opts.clientId}/files`);

  return { success: true as const };
}

// ─── Project Delete ───────────────────────────────────────────────────────────

export async function deleteProjectFile(fileId: string, projectId: string) {
  const file = await db.projectFile.findUnique({ where: { id: fileId } });
  if (!file) return { success: false as const, error: "קובץ לא נמצא" };

  // Best-effort: remove from Supabase Storage (may not exist if env is missing)
  try {
    await deleteFromStorage(file.url);
  } catch {
    // Storage deletion failure is non-fatal — DB record is still removed
  }

  await db.projectFile.delete({ where: { id: fileId } });

  revalidatePath(`/projects/${projectId}/files`);
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
