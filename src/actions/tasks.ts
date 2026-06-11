"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createTaskSchema, type CreateTaskInput } from "@/lib/schemas/task-schema";
import type { TaskStatusValue } from "@/lib/constants/task-enums";
import { TaskPriority, TaskType } from "@/generated/prisma/client";
import { getSession } from "@/lib/session";
import { requireRole, DELETE_ROLES, PROJECT_ROLES } from "@/lib/auth-utils";
import { logActivity, sendNotification } from "@/lib/activity";
import { currentCompanyId } from "@/lib/tenant";

// ─── Label maps ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  TODO: "לביצוע", IN_PROGRESS: "בביצוע", BLOCKED: "חסום", DONE: "הושלם",
};

// Shared include — keeps query shapes consistent
const TASK_INCLUDE = {
  project:    { select: { id: true, name: true, managerId: true } },
  lead:       { select: { id: true, name: true } },
  client:     { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Global /tasks page — all tasks ordered by urgency. */
export async function getAllTasks() {
  const cid = await currentCompanyId();
  return db.task.findMany({
    where: { companyId: cid },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: TASK_INCLUDE,
    take: 500,
  });
}

/** Tasks linked to a specific lead. */
export async function getLeadTasks(leadId: string) {
  return db.task.findMany({
    where:   { leadId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: TASK_INCLUDE,
  });
}

/** Tasks linked to a specific client. */
export async function getClientTasks(clientId: string) {
  return db.task.findMany({
    where:   { clientId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: TASK_INCLUDE,
  });
}

/** Fetch all select-list data for the New Task form in one round-trip. */
export async function getTaskSelectData() {
  const cid = await currentCompanyId();
  const [projects, clients, leads, users] = await Promise.all([
    db.project.findMany({
      where:   { status: { in: ["PLANNING", "ACTIVE"] }, companyId: cid },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.client.findMany({
      where:   { companyId: cid },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.lead.findMany({
      where:   { status: { notIn: ["CONVERTED", "LOST"] }, companyId: cid },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where:   { active: true, companyId: cid },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { projects, clients, leads, users };
}

// ─── Gantt helper ─────────────────────────────────────────────────────────────

export async function getProjectGanttData(projectId: string) {
  return db.task.findMany({
    where:   { projectId },
    orderBy: [{ startDate: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    include: {
      assignedTo:     { select: { id: true, name: true } },
      prefabElements: { select: { id: true, name: true, status: true } },
      dependsOn:      { select: { id: true, name: true } },
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTask(raw: CreateTaskInput) {
  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }

  const {
    projectId, leadId, clientId, assignedToId,
    name, description, status, priority, taskType,
    startDate, dueDate, dependsOnId,
  } = parsed.data;

  // Any project-level role (ADMIN, OFFICE_MANAGER, PROJECT_MANAGER) may create tasks
  const session   = await requireRole(PROJECT_ROLES);
  const actorId   = session.userId;
  const actorName = session.name;
  const cid       = await currentCompanyId();

  const task = await db.task.create({
    data: {
      companyId:    cid,
      projectId:    projectId    || null,
      leadId:       leadId       || null,
      clientId:     clientId     || null,
      assignedToId: assignedToId || null,
      taskType:     (taskType  ?? "GENERAL") as TaskType,
      name,
      description:  description  || null,
      status:       (status    ?? "TODO"),
      priority:     (priority  ?? "MEDIUM") as TaskPriority,
      startDate:    startDate    ? new Date(startDate) : null,
      dueDate:      dueDate      ? new Date(dueDate)   : null,
      dependsOnId:  dependsOnId  || null,
    },
  });

  await logActivity({
    userId:      actorId,
    action:      "TASK_CREATED",
    entityType:  "TASK",
    entityId:    task.id,
    projectId:   projectId || null,
    description: `${actorName} יצר משימה: "${name}"`,
  });

  // Notify assignee if different from creator
  if (assignedToId && assignedToId !== actorId) {
    await sendNotification({
      userId:      assignedToId,
      type:        "TASK_ASSIGNED",
      title:       `✅ משימה חדשה הוקצתה לך: ${name}`,
      body:        dueDate
        ? `תאריך יעד: ${new Date(dueDate).toLocaleDateString("he-IL")}`
        : `על ידי ${actorName}`,
      relatedId:   task.id,
      relatedType: "TASK",
    });
  }

  if (projectId) revalidatePath(`/projects/${projectId}`);
  if (leadId)    revalidatePath(`/leads/${leadId}/tasks`);
  if (clientId)  revalidatePath(`/clients/${clientId}/tasks`);
  revalidatePath("/tasks");

  return { success: true as const, taskId: task.id };
}

/**
 * AI-assistant approval flow: persist a task the user confirmed in the chat
 * UI. Delegates to createTask() so role checks, validation, activity log and
 * notifications stay in one place.
 */
export async function executeCreateTask(payload: {
  title: string;
  dueDate: string;
  priority: string;
  entityId: string;
  entityType?: "project" | "client";
}) {
  const title = payload.title?.trim() ?? "";
  if (title.length < 2) {
    return { success: false as const, error: "invalid_title" };
  }

  const priority = (
    (["LOW", "MEDIUM", "HIGH", "URGENT"] as const).find(
      (p) => p === payload.priority?.toUpperCase(),
    ) ?? "MEDIUM"
  );

  // The model emits dates as strings — only pass ones Prisma can parse.
  const dueDate =
    payload.dueDate && !Number.isNaN(new Date(payload.dueDate).getTime())
      ? payload.dueDate
      : undefined;

  // The entity id originates from the model/client — owned-check it before
  // linking, and fall back to an unlinked task instead of failing approval.
  let projectId: string | undefined;
  let clientId: string | undefined;
  if (payload.entityId) {
    const cid = await currentCompanyId();
    if (payload.entityType === "client") {
      const client = await db.client.findFirst({
        where: { id: payload.entityId, companyId: cid },
        select: { id: true },
      });
      clientId = client?.id;
    } else {
      const project = await db.project.findFirst({
        where: { id: payload.entityId, companyId: cid },
        select: { id: true },
      });
      projectId = project?.id;
    }
  }

  return createTask({ name: title, priority, dueDate, projectId, clientId });
}

export async function updateTaskStatus(id: string, status: TaskStatusValue) {
  // All authenticated users (including FIELD_WORKER) may update task status
  const session   = await getSession();
  if (!session) throw new Error("Unauthorized access");
  const actorId   = session.userId;
  const actorName = session.name;

  const task = await db.task.update({
    where: { id },
    data:  { status, completedAt: status === "DONE" ? new Date() : null },
    select: {
      projectId: true,
      leadId:    true,
      clientId:  true,
      taskType:  true,
      name:      true,
      project:   { select: { managerId: true } },
    },
  });

  await logActivity({
    userId:      actorId,
    action:      "TASK_STATUS_CHANGED",
    entityType:  "TASK",
    entityId:    id,
    projectId:   task.projectId ?? null,
    description: `${actorName} עדכן סטטוס "${task.name}" ל${STATUS_LABEL[status] ?? status}`,
  });

  if (status === "DONE") {
    // Notify project manager
    const managerId = task.project?.managerId ?? null;
    if (managerId && managerId !== actorId) {
      await sendNotification({
        userId:      managerId,
        type:        "TASK_COMPLETED",
        title:       `✅ משימה הושלמה: ${task.name}`,
        body:        `בוצע על ידי ${actorName}`,
        relatedId:   id,
        relatedType: "TASK",
      });
    }

    // Auto-create CommunicationLog for CALL / MEETING CRM tasks
    const isCrmTask = task.leadId || task.clientId;
    const isCrmType = task.taskType === "CALL" || task.taskType === "MEETING";

    if (isCrmTask && isCrmType && actorId) {
      const typeLabel = task.taskType === "CALL" ? "שיחה" : "פגישה";
      await db.communicationLog.create({
        data: {
          type:     task.taskType as "CALL" | "MEETING",
          content:  `${typeLabel} הושלמה: "${task.name}" (${actorName})`,
          leadId:   task.leadId   ?? null,
          clientId: task.clientId ?? null,
          authorId: actorId,
        },
      });
      if (task.leadId)   revalidatePath(`/leads/${task.leadId}/activity`);
      if (task.clientId) revalidatePath(`/clients/${task.clientId}/activity`);
    }
  }

  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  if (task.leadId)    revalidatePath(`/leads/${task.leadId}/tasks`);
  if (task.clientId)  revalidatePath(`/clients/${task.clientId}/tasks`);
  revalidatePath("/tasks");

  return { success: true as const };
}

export async function updateTask(
  id: string,
  data: {
    name:         string;
    description?: string;
    status:       string;
    priority:     string;
    startDate?:   string;
    dueDate?:     string;
    dependsOnId?: string | null;
  },
) {
  const session   = await requireRole(PROJECT_ROLES);
  const actorName = session.name;

  const task = await db.task.update({
    where: { id },
    data:  {
      name:        data.name,
      description: data.description || null,
      status:      data.status      as TaskStatusValue,
      priority:    data.priority    as TaskPriority,
      startDate:   data.startDate   ? new Date(data.startDate) : null,
      dueDate:     data.dueDate     ? new Date(data.dueDate)   : null,
      dependsOnId: data.dependsOnId || null,
      completedAt: data.status === "DONE" ? new Date() : null,
    },
    select: { projectId: true, leadId: true, clientId: true, name: true },
  });

  await logActivity({
    userId:      session.userId,
    action:      "TASK_UPDATED",
    entityType:  "TASK",
    entityId:    id,
    projectId:   task.projectId ?? null,
    description: `${actorName} עדכן משימה "${task.name}"`,
  });

  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  if (task.leadId)    revalidatePath(`/leads/${task.leadId}/tasks`);
  if (task.clientId)  revalidatePath(`/clients/${task.clientId}/tasks`);
  revalidatePath("/tasks");
  return { success: true as const };
}

export async function deleteTask(id: string) {
  await requireRole(DELETE_ROLES);
  const task = await db.task.delete({
    where:  { id },
    select: { projectId: true, leadId: true, clientId: true },
  });
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  if (task.leadId)    revalidatePath(`/leads/${task.leadId}/tasks`);
  if (task.clientId)  revalidatePath(`/clients/${task.clientId}/tasks`);
  revalidatePath("/tasks");
  return { success: true as const };
}

// ─── Project seed (unchanged) ─────────────────────────────────────────────────

export async function seedProjectTasks(projectId: string) {
  const existing = await db.task.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  const now = new Date();
  const d   = (days: number) => new Date(now.getTime() + days * 86_400_000);

  type SeedTask = {
    name:         string;
    priority:     "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status:       "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
    description?: string;
    dueDate?:     Date;
    completedAt?: Date;
  };

  const tasks: SeedTask[] = [
    { name: "יציקת יסודות — עמוד A1",        priority: "HIGH",   status: "DONE",        completedAt: d(-45) },
    { name: "יציקת יסודות — עמוד A2",        priority: "HIGH",   status: "DONE",        completedAt: d(-43) },
    { name: "הנחת אינסטלציה תת-קרקעית",      priority: "MEDIUM", status: "DONE",        completedAt: d(-30) },
    { name: "קירוי קומה א׳ — ביצוע",          priority: "HIGH",   status: "IN_PROGRESS" },
    { name: "חיפוי חיצוני — קיר צפון",       priority: "MEDIUM", status: "IN_PROGRESS" },
    { name: "אישור מהנדס קונסטרוקציה",       priority: "URGENT", status: "BLOCKED",
      description: "ממתין לאישור מהנדס חיצוני — ד׳ זילברמן" },
    { name: "התקנת מערכת חשמל — לוח ראשי",   priority: "HIGH",   status: "TODO", dueDate: d(14) },
    { name: "ריצוף לובי כניסה",              priority: "LOW",    status: "TODO", dueDate: d(30) },
    { name: "צביעת חדרי שירות",              priority: "LOW",    status: "TODO" },
    { name: "בדיקת אטימות גג",               priority: "MEDIUM", status: "TODO", dueDate: d(21) },
  ];

  for (const t of tasks) {
    await db.task.create({
      data: {
        projectId,
        name:        t.name,
        priority:    t.priority,
        status:      t.status,
        description: t.description ?? null,
        dueDate:     t.dueDate     ?? null,
        completedAt: t.completedAt ?? null,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
