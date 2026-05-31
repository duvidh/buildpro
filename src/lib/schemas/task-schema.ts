import { z } from "zod";
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES, TASK_TYPE_VALUES } from "@/lib/constants/task-enums";

export type TaskValidationMessages = {
  nameRequired?: string;
};

const DEFAULT_MSGS = {
  nameRequired: "שם חייב להכיל לפחות 2 תווים",
};

export function buildCreateTaskSchema(msgs: TaskValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z.object({
    name:         z.string().min(2, m.nameRequired),
    description:  z.string().optional(),
    status:       z.enum(TASK_STATUS_VALUES).optional(),
    priority:     z.enum(TASK_PRIORITY_VALUES).optional(),
    taskType:     z.enum(TASK_TYPE_VALUES).optional(),
    projectId:    z.string().optional(),
    leadId:       z.string().optional(),
    clientId:     z.string().optional(),
    assignedToId: z.string().optional(),
    startDate:    z.string().optional(),
    dueDate:      z.string().optional(),
    dependsOnId:  z.string().optional(),
  });
}

export const createTaskSchema = buildCreateTaskSchema();
export type CreateTaskInput = z.infer<ReturnType<typeof buildCreateTaskSchema>>;
