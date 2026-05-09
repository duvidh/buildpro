"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createTaskSchema, type CreateTaskInput } from "@/lib/schemas/task-schema";
import type { TaskStatusValue } from "@/lib/constants/task-enums";

export async function getAllTasks() {
  return db.task.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    take: 200,
  });
}

export async function createTask(raw: CreateTaskInput) {
  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "שגיאת ולידציה" };
  }
  const { projectId, name, description, status, priority, dueDate } = parsed.data;
  const task = await db.task.create({
    data: {
      projectId,
      name,
      description: description || null,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  return { success: true as const, taskId: task.id };
}

export async function updateTaskStatus(id: string, status: TaskStatusValue) {
  const task = await db.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return { success: true as const };
}

export async function deleteTask(id: string) {
  const task = await db.task.delete({ where: { id } });
  revalidatePath(`/projects/${task.projectId}`);
  return { success: true as const };
}

export async function seedProjectTasks(projectId: string) {
  const existing = await db.task.count({ where: { projectId } });
  if (existing > 0) return { success: true as const, skipped: true };

  const now = new Date();
  const d = (days: number) => new Date(now.getTime() + days * 86400000);

  type SeedTask = {
    name: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
    description?: string;
    dueDate?: Date;
    completedAt?: Date;
  };

  const tasks: SeedTask[] = [
    { name: "יציקת יסודות — עמוד A1", priority: "HIGH", status: "DONE", completedAt: d(-45) },
    { name: "יציקת יסודות — עמוד A2", priority: "HIGH", status: "DONE", completedAt: d(-43) },
    { name: "הנחת אינסטלציה תת-קרקעית", priority: "MEDIUM", status: "DONE", completedAt: d(-30) },
    { name: "קירוי קומה א׳ — ביצוע", priority: "HIGH", status: "IN_PROGRESS" },
    { name: "חיפוי חיצוני — קיר צפון", priority: "MEDIUM", status: "IN_PROGRESS" },
    {
      name: "אישור מהנדס קונסטרוקציה",
      priority: "URGENT",
      status: "BLOCKED",
      description: "ממתין לאישור מהנדס חיצוני — ד׳ זילברמן",
    },
    { name: "התקנת מערכת חשמל — לוח ראשי", priority: "HIGH", status: "TODO", dueDate: d(14) },
    { name: "ריצוף לובי כניסה", priority: "LOW", status: "TODO", dueDate: d(30) },
    { name: "צביעת חדרי שירות", priority: "LOW", status: "TODO" },
    { name: "בדיקת אטימות גג", priority: "MEDIUM", status: "TODO", dueDate: d(21) },
  ];

  for (const t of tasks) {
    await db.task.create({
      data: {
        projectId,
        name: t.name,
        priority: t.priority,
        status: t.status,
        description: t.description ?? null,
        dueDate: t.dueDate ?? null,
        completedAt: t.completedAt ?? null,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true as const };
}
