import { z } from "zod";

export type MilestoneValidationMessages = {
  nameRequired?: string;
  dateRequired?: string;
};

const DEFAULT_MSGS = {
  nameRequired: "שם חייב להכיל לפחות 2 תווים",
  dateRequired: "תאריך חובה",
};

export function buildCreateMilestoneSchema(msgs: MilestoneValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z.object({
    projectId: z.string().min(1),
    name:      z.string().min(2, m.nameRequired),
    date:      z.string().min(1, m.dateRequired),
    weight:    z.string().optional(),
    notes:     z.string().optional(),
  });
}

export const createMilestoneSchema = buildCreateMilestoneSchema();
export type CreateMilestoneInput = z.infer<ReturnType<typeof buildCreateMilestoneSchema>>;
