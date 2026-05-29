import { z } from "zod";
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES, TASK_TYPE_VALUES } from "@/lib/constants/task-enums";

// Global polymorphic task schema — projectId, leadId, clientId all optional
export const createTaskSchema = z.object({
  name:         z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  description:  z.string().optional(),
  status:       z.enum(TASK_STATUS_VALUES).optional(),
  priority:     z.enum(TASK_PRIORITY_VALUES).optional(),
  taskType:     z.enum(TASK_TYPE_VALUES).optional(),
  // Context — exactly one (or none for personal tasks)
  projectId:    z.string().optional(),
  leadId:       z.string().optional(),
  clientId:     z.string().optional(),
  // Assignment
  assignedToId: z.string().optional(),
  // Scheduling
  startDate:    z.string().optional(),
  dueDate:      z.string().optional(),
  // Dependencies (project tasks only)
  dependsOnId:  z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
