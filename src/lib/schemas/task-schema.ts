import { z } from "zod";
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES } from "@/lib/constants/task-enums";

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS_VALUES),
  priority: z.enum(TASK_PRIORITY_VALUES),
  dueDate: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
